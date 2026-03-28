import {
  listUIMessages,
  type SyncStreamsReturnValue,
  syncStreams,
} from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import type { UserContent, UserModelMessage } from "ai";
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
import {
  ensureMachineAccount,
  ensureTokenAccount,
  grantThreadAccessToAccount,
  resolveAccountByAlias,
} from "../lib/auth";
import type { UIMessage } from "../llms/uiMessage";
import { chatAgentDefinition, createChatAgent } from "./agent";
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

function isTextLikeMime(mime: string) {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  );
}

async function buildSearchQueryFromAttachments(
  ctx: SessionActionCtx,
  prompt: string,
  attachments:
    | { storageId: string; fileName: string; mimeType: string }[]
    | undefined,
): Promise<string> {
  const parts: string[] = [];
  if (prompt.trim()) parts.push(prompt.trim());
  if (!attachments?.length) return parts.join(" ");

  for (const a of attachments) {
    parts.push(a.fileName);
    if (!isTextLikeMime(a.mimeType)) continue;
    const blob = await ctx.storage.get(a.storageId);
    if (!blob) continue;
    const text = await blob.text();
    if (text.length) {
      parts.push(text.slice(0, 2000));
    }
  }
  return parts.join("\n\n");
}

const attachmentSchema = z.object({
  storageId: zid("_storage"),
  fileName: z.string(),
  mimeType: z.string(),
});

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
    const agent = await createChatAgent();
    const owner = await ensureTokenAccount(ctx, args.token);
    const machine = await ensureMachineAccount(ctx, {
      codeId: chatAgentDefinition.agentId,
      name: chatAgentDefinition.name,
    });
    const thread = await agent.createThread(ctx, {
      title: args.title,
      userId: owner._id,
    });
    await grantThreadAccessToAccount(ctx, {
      account: owner._id,
      threadId: thread.threadId,
      actions: ["read", "write", "own"],
    });
    await grantThreadAccessToAccount(ctx, {
      account: machine._id,
      threadId: thread.threadId,
      actions: ["read", "write"],
    });
    return thread;
  },
});

export const sendMessage = sessionAction({
  args: {
    threadId: z.string(),
    prompt: z.string(),
    /** Same value as `createThread` — required for actions because `sessions.account` may be unset until this runs. */
    token: z.string().min(1),
    attachments: z.array(attachmentSchema).optional(),
  },
  handler: async (ctx: SessionActionCtx, args) => {
    const attachments = args.attachments;

    const { namespace, userId } = await resolveThreadContext(
      ctx,
      args.threadId,
      args.sessionId,
      { token: args.token },
    );

    const hasAttachments = Boolean(attachments?.length);
    if (!args.prompt.trim() && !hasAttachments) {
      throw new Error("Message must include text or at least one attachment.");
    }

    const baseAgent = await createChatAgent();

    let promptMessageId: string;

    if (!hasAttachments) {
      const saved = await baseAgent.saveMessage(ctx, {
        threadId: args.threadId,
        userId,
        prompt: args.prompt,
      });
      promptMessageId = saved.messageId;
    } else {
      const content: UserContent = [];
      if (args.prompt.trim()) {
        content.push({ type: "text", text: args.prompt.trim() });
      }
      for (const a of attachments ?? []) {
        const blob = await ctx.storage.get(a.storageId);
        if (!blob) {
          throw new Error(`Missing file in storage: ${a.fileName}`);
        }
        const data = await blob.arrayBuffer();
        content.push({
          type: "file",
          data,
          mediaType: a.mimeType || "application/octet-stream",
          filename: a.fileName,
        });
      }
      const message: UserModelMessage = { role: "user", content };
      const saved = await baseAgent.saveMessage(ctx, {
        threadId: args.threadId,
        userId,
        message,
      });
      promptMessageId = saved.messageId;
    }

    const searchQuery = await buildSearchQueryFromAttachments(
      ctx,
      args.prompt,
      attachments,
    );

    const searchResults: SearchContextHit[] = await ctx.runAction(
      api.context.search.searchContext,
      {
        sessionId: args.sessionId,
        namespace,
        query: searchQuery || args.prompt || "files",
        limit: 10,
        retrievalMode: "hybrid",
        threadId: args.threadId,
      },
    );
    const injected = buildInjectedContext(searchResults);

    const agent = await createChatAgent({
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
        system: injected ?? undefined,
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
