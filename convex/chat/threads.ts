import {
  createThread as createAgentThread,
  listUIMessages,
  type SyncStreamsReturnValue,
  saveMessages,
  syncStreams,
} from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import type {
  FilePart,
  ImagePart,
  ModelMessage,
  UserContent,
  UserModelMessage,
} from "ai";
import type { PaginationOptions, PaginationResult } from "convex/server";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod/v4";
import { api, components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { SearchContextHit } from "../context/search";
import {
  type SessionActionCtx,
  type SessionQueryCtx,
  sessionAction,
  sessionMutation,
  sessionPaginatedQuery,
} from "../customFunctions";
import { getNgrokUrl, isLocalAgentMode } from "../env";
import { ensureTokenAccount, resolveAccountByAlias } from "../lib/auth";
import { agentLibrary } from "../llms/agents";
import type { UIMessage } from "../llms/uiMessage";
import { resolveThreadContext } from "./resolveNamespace";

/** Convex `Agent` expects `ActionCtx & Record<string, unknown>`; session actions add `runSession*` without an index signature. */
function agentActionCtx(
  ctx: SessionActionCtx,
): ActionCtx & Record<string, unknown> {
  return ctx as unknown as ActionCtx & Record<string, unknown>;
}

function buildInjectedContext(hits: SearchContextHit[]): string | undefined {
  if (!hits.length) return undefined;
  const lines = hits.slice(0, 3).map((r, i) => {
    const title = r.title ? `${r.title}\n` : "";
    const body = r.text.length > 2000 ? `${r.text.slice(0, 2000)}…` : r.text;
    return `[${i + 1}] ${title}${body}`;
  });
  return `Retrieved context (may be incomplete):\n${lines.join("\n\n---\n\n")}`;
}

const attachmentSchema = z.object({
  storageId: zid("_storage"),
  fileName: z.string(),
  mimeType: z.string(),
  contentHash: z.string(),
  text: z.string().optional(),
});

/** Rewrite localhost storage URLs so providers can fetch via ngrok (local agent dev only). */
function publicStorageUrl(localUrl: string): string {
  if (!isLocalAgentMode()) return localUrl;
  const ngrok = getNgrokUrl();
  if (!ngrok) return localUrl;
  try {
    const parsed = new URL(localUrl);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    ) {
      const target = new URL(ngrok);
      // V8 actions: mutating URL (e.g. .host =) throws "Not implemented: set host for URL".
      return `${target.protocol}//${target.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return localUrl;
  }
  return localUrl;
}

function getFileParts(
  url: string,
  mediaType: string,
  filename?: string,
): { filePart: FilePart; imagePart: ImagePart | undefined } {
  const filePart: FilePart = {
    type: "file",
    data: new URL(url),
    mediaType,
    filename,
  };
  const imagePart: ImagePart | undefined = mediaType.startsWith("image/")
    ? { type: "image", image: new URL(url), mediaType }
    : undefined;
  return { filePart, imagePart };
}

async function buildUserMessageWithFiles(
  ctx: SessionActionCtx,
  prompt: string,
  attachments: z.infer<typeof attachmentSchema>[] | undefined,
): Promise<{ message: UserModelMessage; fileIds: string[] }> {
  const fileIds: string[] = [];
  const content: UserContent = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  for (const a of attachments ?? []) {
    const { fileId } = await ctx.runMutation(components.agent.files.addFile, {
      storageId: a.storageId,
      hash: a.contentHash,
      filename: a.fileName,
      mimeType: a.mimeType,
    });
    fileIds.push(fileId);
    const rawUrl = await ctx.storage.getUrl(a.storageId);
    if (!rawUrl) {
      throw new Error(`Missing file in storage: ${a.fileName}`);
    }
    const url = publicStorageUrl(rawUrl);
    const { filePart, imagePart } = getFileParts(
      url,
      a.mimeType || "application/octet-stream",
      a.fileName,
    );
    content.push(imagePart ?? filePart);
  }
  return { message: { role: "user", content }, fileIds };
}

const streamArgsSchema = z.union([
  z.object({
    kind: z.literal("list"),
    startOrder: z.number().optional(),
  }),
  z.object({
    kind: z.literal("deltas"),
    cursors: z.array(
      z.object({
        streamId: z.string(),
        cursor: z.number(),
      }),
    ),
  }),
]);

export const createThread = sessionMutation({
  args: {
    token: z.string(),
    title: z.string().optional(),
  },
  handler: async (ctx, args) => {
    const owner = await ensureTokenAccount(ctx, args.token);

    return await createAgentThread(ctx, components.agent, {
      title: args.title,
      userId: owner._id,
    });
  },
});

export const sendMessage = sessionAction({
  args: {
    threadId: z.string(),
    prompt: z.string(),
    /** Same value as `createThread` — required for actions because `sessions.account` may be unset until this runs. */
    token: z.string().min(1),
    attachments: z.array(attachmentSchema).optional(),
    /** Hybrid lexical query; built on the client with `buildLexicalContextQuery`. */
    searchQuery: z.string(),
    /** One vector per attachment, same order as `attachments`. */
    fileEmbeddings: z.array(z.array(z.number())).optional(),
  },
  handler: async (ctx: SessionActionCtx, args) => {
    const hasAttachments = Boolean(args.attachments?.length);
    if (!args.prompt.trim() && !hasAttachments) {
      throw new Error("Message must include text or at least one attachment.");
    }

    const { namespace, userId } = await resolveThreadContext(
      ctx,
      args.threadId,
      args.sessionId,
      { token: args.token },
    );

    const searchResults = await ctx.runAction(
      api.context.search.searchContext,
      {
        sessionId: args.sessionId,
        namespace,
        query: args.searchQuery.trim() || args.prompt.trim() || "context",
        limit: 10,
        retrievalMode: "hybrid",
        fileEmbeddings: args.fileEmbeddings,
        threadId: args.threadId,
      },
    );
    const injected = buildInjectedContext(searchResults);

    const { message: userMessage, fileIds } = await buildUserMessageWithFiles(
      ctx,
      args.prompt,
      args.attachments,
    );

    const messagesToSave: ModelMessage[] = [userMessage];
    if (injected) {
      messagesToSave.unshift({ role: "system", content: injected });
    }

    const { messages } = await saveMessages(ctx, components.agent, {
      threadId: args.threadId,
      userId,
      messages: messagesToSave,
      metadata: fileIds.length > 0 ? [{ fileIds }] : undefined,
    });

    const promptMessageId = messages.at(-1)?._id;
    if (!promptMessageId) throw new Error("Failed to save prompt message");

    const agent = await agentLibrary.assistant({
      ...ctx,
      threadId: args.threadId,
      messageId: promptMessageId,
      namespace,
      sessionId: args.sessionId,
    });

    const { thread } = await agent.continueThread(agentActionCtx(ctx), {
      threadId: args.threadId,
      userId,
    });

    const result = await thread.streamText(
      {
        promptMessageId,
      },
      {
        saveStreamDeltas: { throttleMs: 50 },
        contextOptions: {
          searchOtherThreads: true,
        },
      },
    );

    return {
      order: result.order,
      promptMessageId: result.promptMessageId,
      text: await result.text,
    };
  },
});

type ListThreadMessagesPage = PaginationResult<UIMessage> & {
  streams: SyncStreamsReturnValue;
};

export const listRecentThreads = sessionPaginatedQuery({
  args: {
    token: z.string(),
  },
  handler: async (
    ctx: SessionQueryCtx,
    args: { token: string; paginationOpts: PaginationOptions },
  ) => {
    const owner = await resolveAccountByAlias(ctx, {
      kind: "token",
      value: args.token,
    });
    if (!owner) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }
    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: String(owner._id),
      order: "desc",
      paginationOpts: args.paginationOpts,
    });
  },
});

export const listThreadMessages = sessionPaginatedQuery({
  args: {
    threadId: z.string(),
    streamArgs: streamArgsSchema.optional(),
  },
  handler: async (
    ctx: SessionQueryCtx,
    args: {
      threadId: string;
      paginationOpts: PaginationOptions;
      streamArgs?: z.infer<typeof streamArgsSchema>;
    },
  ): Promise<ListThreadMessagesPage> => {
    const streamArgs: StreamArgs =
      args.streamArgs != null
        ? streamArgsSchema.parse(args.streamArgs)
        : { kind: "list" };
    const agentArgs = {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      streamArgs,
    };
    const paginated = await listUIMessages(ctx, components.agent, agentArgs);
    const streams = await syncStreams(ctx, components.agent, agentArgs);
    return {
      ...paginated,
      streams,
    };
  },
});
