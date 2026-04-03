import {
  createThread as createAgentThread,
  listUIMessages,
  type SyncStreamsReturnValue,
  saveMessages,
  syncStreams,
} from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import type { ModelMessage, UserContent, UserModelMessage } from "ai";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id as MemoryComponentId } from "../_components/memory/_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import {
  type ActionCtx,
  internalAction,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server.js";
import type { UIMessage } from "../agents/_tools/uiMessage.js";
import { createAssistantAgent } from "../agents/assistant/createAgent.js";

/** Convex `Agent` expects `ActionCtx & Record<string, unknown>`. */
function agentActionCtx(ctx: ActionCtx): ActionCtx & Record<string, unknown> {
  return ctx as ActionCtx & Record<string, unknown>;
}

function getFileParts(url: string, mediaType: string, filename?: string) {
  const filePart = {
    type: "file" as const,
    data: new URL(url),
    mediaType,
    filename,
  };
  const imagePart = mediaType.startsWith("image/")
    ? ({
        type: "image" as const,
        image: new URL(url),
        mediaType,
      } satisfies UserContent[number])
    : undefined;
  return { filePart, imagePart };
}

type MessageBuildCtx = Pick<
  MutationCtx,
  "runMutation" | "storage" | "db" | "runQuery"
>;

type UserMessageParts = Exclude<UserModelMessage["content"], string>;

async function appendFileAttachmentParts(
  ctx: MessageBuildCtx,
  attachment: {
    storageId: string;
    fileName: string;
    mimeType: string;
    contentHash: string;
  },
  fileIds: string[],
  content: UserMessageParts,
) {
  const hash =
    attachment.contentHash.trim().length > 0
      ? attachment.contentHash
      : "memory-attachment";
  const { fileId } = await ctx.runMutation(components.agent.files.addFile, {
    storageId: attachment.storageId,
    hash,
    filename: attachment.fileName,
    mimeType: attachment.mimeType,
  });
  fileIds.push(fileId);

  const rawUrl = await ctx.storage.getUrl(
    attachment.storageId as Id<"_storage">,
  );
  if (!rawUrl) {
    throw new Error(`Missing file in storage: ${attachment.fileName}`);
  }
  const { filePart, imagePart } = getFileParts(
    rawUrl,
    attachment.mimeType || "application/octet-stream",
    attachment.fileName,
  );
  content.push(imagePart ?? filePart);
}

async function appendMemoryRecordParts(
  ctx: MessageBuildCtx,
  namespace: string,
  memoryRecordIds: string[],
  fileIds: string[],
  content: UserMessageParts,
) {
  for (const rawId of memoryRecordIds) {
    const maps = await ctx.runQuery(
      components.memory.public.sourceMaps.listSourceMapsForMemory,
      {
        namespace,
        memoryRecordId: rawId as MemoryComponentId<"memoryRecords">,
      },
    );
    const storageRow = maps.find((m) => m.contentSource.type === "storage");
    if (storageRow) {
      await appendFileAttachmentParts(
        ctx,
        {
          storageId: storageRow.contentSource.id,
          fileName: storageRow.fileName ?? "file",
          mimeType: storageRow.mimeType ?? "application/octet-stream",
          contentHash: "",
        },
        fileIds,
        content,
      );
      continue;
    }
    const rec = await ctx.runQuery(
      components.memory.public.records.getMemoryRecord,
      {
        namespace,
        memoryRecordId: rawId as MemoryComponentId<"memoryRecords">,
      },
    );
    if (!rec?.text?.trim()) {
      throw new Error(
        `Memory ${rawId} has no storage source map and no canonical text on the record`,
      );
    }
    content.push({
      type: "text",
      text: rec.text.trim(),
      providerOptions: { ui: { visible: false } },
    });
  }
}

async function buildUserMessageWithFiles(
  ctx: MessageBuildCtx,
  prompt: string,
  attachments:
    | Array<{
        storageId: string;
        fileName: string;
        mimeType: string;
        contentHash: string;
      }>
    | undefined,
  namespace: string,
  memoryRecordIds: string[] | undefined,
): Promise<{ message: UserModelMessage; fileIds: string[] }> {
  const fileIds: string[] = [];
  const content: UserMessageParts = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  for (const attachment of attachments ?? []) {
    await appendFileAttachmentParts(ctx, attachment, fileIds, content);
  }
  if (memoryRecordIds?.length) {
    await appendMemoryRecordParts(
      ctx,
      namespace,
      memoryRecordIds,
      fileIds,
      content,
    );
  }
  return { message: { role: "user", content }, fileIds };
}

const streamArgsValidator = v.union(
  v.object({
    kind: v.literal("list"),
    startOrder: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("deltas"),
    cursors: v.array(
      v.object({
        streamId: v.string(),
        cursor: v.number(),
      }),
    ),
  }),
);

type ListThreadMessagesPage = PaginationResult<UIMessage> & {
  streams: SyncStreamsReturnValue;
};

export const createThread = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createAgentThread(ctx, components.agent, {
      title: args.title,
      userId: args.userId,
    });
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    namespace: v.string(),
    prompt: v.string(),
    sessionId: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.string(),
          fileName: v.string(),
          mimeType: v.string(),
          contentHash: v.string(),
        }),
      ),
    ),
    memoryRecordIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    promptMessageId: v.string(),
    scheduled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const hasAttachments = Boolean(args.attachments?.length);
    const hasMemories = Boolean(args.memoryRecordIds?.length);
    if (!args.prompt.trim() && !hasAttachments && !hasMemories) {
      throw new Error(
        "Message must include text, attachments, or memory selections.",
      );
    }

    const { message: userMessage, fileIds } = await buildUserMessageWithFiles(
      ctx,
      args.prompt,
      args.attachments,
      args.namespace,
      args.memoryRecordIds,
    );

    const messagesToSave: ModelMessage[] = [userMessage];
    const { messages } = await saveMessages(ctx, components.agent, {
      threadId: args.threadId,
      userId: args.userId,
      messages: messagesToSave,
      metadata: fileIds.length > 0 ? [{ fileIds }] : undefined,
    });

    const promptMessageId = messages.at(-1)?._id;
    if (!promptMessageId) {
      throw new Error("Failed to save prompt message");
    }

    await ctx.scheduler.runAfter(0, internal.chat.thread.continueThreadStream, {
      threadId: args.threadId,
      userId: args.userId,
      namespace: args.namespace,
      sessionId: args.sessionId ?? args.threadId,
      promptMessageId,
    });

    return {
      promptMessageId,
      scheduled: true,
    };
  },
});

export const continueThreadStream = internalAction({
  args: {
    threadId: v.string(),
    userId: v.string(),
    namespace: v.string(),
    sessionId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await createAssistantAgent({
      ...ctx,
      threadId: args.threadId,
      messageId: args.promptMessageId,
      namespace: args.namespace,
      sessionId: args.sessionId,
      agentId: "assistant",
      agentName: "Assistant",
    });

    const { thread } = await agent.continueThread(agentActionCtx(ctx), {
      threadId: args.threadId,
      userId: args.userId,
    });

    const result = await thread.streamText(
      { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: { throttleMs: 100, returnImmediately: true },
        contextOptions: {
          searchOtherThreads: true,
        },
      },
    );

    await result.text;
    return null;
  },
});

export const listRecentThreads = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: args.userId,
      order: "desc",
      paginationOpts: args.paginationOpts,
    });
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(streamArgsValidator),
  },
  handler: async (ctx, args): Promise<ListThreadMessagesPage> => {
    const streamArgs: StreamArgs =
      args.streamArgs != null ? args.streamArgs : { kind: "list" };
    const agentArgs = {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      streamArgs,
    };
    const paginated = await listUIMessages(ctx, components.agent, agentArgs);
    const streams = await syncStreams(ctx, components.agent, agentArgs);
    return {
      ...paginated,
      page: paginated.page as UIMessage[],
      streams,
    };
  },
});
