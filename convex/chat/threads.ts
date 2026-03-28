import { listUIMessages, syncStreams } from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import type { PaginationResult } from "convex/server";
import { z } from "zod/v4";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  sessionAction,
  sessionMutation,
  sessionPaginatedQuery,
  type SessionActionCtx,
  type SessionQueryCtx,
} from "../customFunctions";
import {
  ensureMachineAccount,
  ensureTokenAccount,
  grantThreadAccessToAccount,
} from "../lib/auth";
import type { UIMessage } from "../llms/uiMessage";
import { chatAgentDefinition, createChatAgent } from "./agent";
import { resolveThreadContext } from "./resolveNamespace";

type SearchHit = {
  entryId: string;
  title?: string;
  text: string;
  score: number;
};

function buildInjectedContext(hits: SearchHit[]): string | undefined {
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
  ctx: { storage: { get: (id: Id<"_storage">) => Promise<Blob | null> } },
  prompt: string,
  attachments:
    | { storageId: Id<"_storage">; fileName: string; mimeType: string }[]
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
  storageId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
});

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
    attachments: z.array(attachmentSchema).optional(),
  },
  handler: async (ctx: SessionActionCtx, args) => {
    const attachments = args.attachments?.map((a) => ({
      ...a,
      storageId: a.storageId as Id<"_storage">,
    }));

    const { namespace, userId } = await resolveThreadContext(
      ctx,
      args.threadId,
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
      const content: Array<Record<string, unknown>> = [];
      if (args.prompt.trim()) {
        content.push({ type: "text", text: args.prompt.trim() });
      }
      for (const a of attachments ?? []) {
        const blob = await ctx.storage.get(a.storageId);
        if (!blob) {
          throw new Error(`Missing file in storage: ${a.fileName}`);
        }
        const data = new Uint8Array(await blob.arrayBuffer());
        content.push({
          type: "file",
          data,
          mimeType: a.mimeType || "application/octet-stream",
          filename: a.fileName,
        });
      }
      const saved = await baseAgent.saveMessage(ctx, {
        threadId: args.threadId,
        userId,
        message: { role: "user", content } as never,
      });
      promptMessageId = saved.messageId;
    }

    const searchQuery = await buildSearchQueryFromAttachments(
      ctx,
      args.prompt,
      attachments,
    );

    const searchResults = await ctx.runAction(api.context.search.searchContext, {
      sessionId: args.sessionId,
      namespace,
      query: searchQuery || args.prompt || "files",
      limit: 10,
      retrievalMode: "hybrid",
      threadId: args.threadId,
    });
    const hits = searchResults as SearchHit[];
    const injected = buildInjectedContext(hits);

    const agent = await createChatAgent({
      ...ctx,
      threadId: args.threadId,
      messageId: promptMessageId,
      namespace,
      sessionId: args.sessionId,
    });

    const { thread } = await agent.continueThread(
      ctx as unknown as Parameters<typeof agent.continueThread>[0],
      {
        threadId: args.threadId,
        userId,
      },
    );

    const result = await thread.streamText(
      {
        promptMessageId,
        system: injected ?? undefined,
      } as unknown as Parameters<typeof thread.streamText>[0],
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

export const listThreadMessages = sessionPaginatedQuery({
  args: {
    threadId: z.string(),
    streamArgs: z.any(),
  },
  handler: async (
    ctx: SessionQueryCtx,
    args: {
      threadId: string;
      paginationOpts: import("convex/server").PaginationOptions;
      streamArgs: unknown;
    },
  ) => {
    const streamArgs: StreamArgs =
      args.streamArgs != null
        ? (args.streamArgs as StreamArgs)
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
    } as PaginationResult<UIMessage> & {
      streams: Awaited<ReturnType<typeof syncStreams>>;
    };
  },
});
