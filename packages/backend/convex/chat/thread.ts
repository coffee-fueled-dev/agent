import {
  createThread as createAgentThread,
  listMessages,
  type SyncStreamsReturnValue,
  saveMessages,
  syncStreams,
} from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import type { UserContent, UserModelMessage } from "ai";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
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
import {
  ASSISTANT_ACTOR_KEY,
  CHAT_ACTOR_STREAM_TYPE,
  type ChatActorTurnPayload,
  chatActorHistory,
  chatActorStreamId,
} from "./actorHistory.js";
import { upsertChatContextRow } from "./chatContext.js";
import { executeHumanToolCallsForTurn } from "./executeHumanToolCallsForTurn.js";
import {
  filterEffectiveHumanToolCalls,
  humanToolCallValidator,
} from "./humanToolCallValidator.js";
import { CHAT_PROVIDER_METADATA_NS } from "./resolveMemories.js";
import {
  type ThreadMessageMetadata,
  toThreadUIMessages,
} from "./threadUiMessages.js";

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
): Promise<{ message: UserModelMessage; fileIds: string[] }> {
  const fileIds: string[] = [];
  const content: UserMessageParts = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  for (const attachment of attachments ?? []) {
    await appendFileAttachmentParts(ctx, attachment, fileIds, content);
  }
  if (content.length === 0) {
    content.push({ type: "text", text: "" });
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

type ListThreadMessagesPage = PaginationResult<
  UIMessage<ThreadMessageMetadata>
> & {
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
    ...SessionIdArg,
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
    toolCalls: v.optional(v.array(humanToolCallValidator)),
  },
  returns: v.object({
    promptMessageId: v.string(),
    scheduled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const hasAttachments = Boolean(args.attachments?.length);
    const toolCalls = args.toolCalls ?? [];
    const hasToolCalls = toolCalls.length > 0;
    if (!args.prompt.trim() && !hasAttachments && !hasToolCalls) {
      throw new Error("Message must include text, attachments, or tool calls.");
    }

    const turnId = crypto.randomUUID();

    const { message: userMessage, fileIds } = await buildUserMessageWithFiles(
      ctx,
      args.prompt,
      args.attachments,
    );

    const cfdMeta = {
      [CHAT_PROVIDER_METADATA_NS]: {
        turnId,
        threadId: args.threadId,
      },
    };

    const userMeta = {
      ...(fileIds.length > 0 ? { fileIds } : {}),
      providerMetadata: cfdMeta,
    };
    const { messages } = await saveMessages(ctx, components.agent, {
      threadId: args.threadId,
      userId: args.userId,
      messages: [userMessage],
      metadata: [userMeta],
    });

    const promptMessageId = messages[0]?._id;
    if (!promptMessageId) {
      throw new Error("Failed to save prompt message");
    }

    const tipId = promptMessageId;

    const { sessionId } = args;
    await upsertChatContextRow(ctx, {
      namespace: args.namespace,
      threadId: args.threadId,
      lastMessageId: tipId,
      sessionId,
    });

    await ctx.scheduler.runAfter(0, internal.chat.thread.continueThreadStream, {
      threadId: args.threadId,
      userId: args.userId,
      namespace: args.namespace,
      sessionId,
      promptMessageId,
      turnId,
      ...(hasToolCalls ? { toolCalls } : {}),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.agents.human.recordHumanTurn.recordHumanTurnBackground,
      {
        threadId: args.threadId,
        messageId: promptMessageId,
        sessionId,
        namespace: args.namespace,
      },
    );

    return {
      promptMessageId,
      scheduled: true,
    };
  },
});

/** Persists human tool assistant rows after the user message; invoked from {@link continueThreadStream}. */
export const applyHumanToolCallsForTurn = internalAction({
  args: {
    threadId: v.string(),
    userId: v.string(),
    namespace: v.string(),
    ...SessionIdArg,
    promptMessageId: v.string(),
    turnId: v.string(),
    toolCalls: v.array(humanToolCallValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const toolCalls = filterEffectiveHumanToolCalls(args.toolCalls);
    if (toolCalls.length === 0) {
      return null;
    }
    const [assistantWithToolCalls, toolResultsMessage] =
      await executeHumanToolCallsForTurn(ctx, {
        threadId: args.threadId,
        namespace: args.namespace,
        sessionId: args.sessionId,
        toolCalls,
      });
    const cfdMeta = {
      [CHAT_PROVIDER_METADATA_NS]: {
        turnId: args.turnId,
        threadId: args.threadId,
      },
    };
    await saveMessages(ctx, components.agent, {
      threadId: args.threadId,
      userId: args.userId,
      promptMessageId: args.promptMessageId,
      messages: [assistantWithToolCalls, toolResultsMessage],
      metadata: [{ providerMetadata: cfdMeta }, { providerMetadata: cfdMeta }],
    });
    return null;
  },
});

/** Chat context tip + actor history after the assistant stream completes (not on the stream critical path). */
export const finalizeAssistantStreamTurn = internalAction({
  args: {
    threadId: v.string(),
    namespace: v.string(),
    ...SessionIdArg,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tipPage = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 1 },
    });
    const tip = tipPage.page[0];
    if (tip) {
      await ctx.runMutation(
        internal.chat.chatContext.internalUpsertChatContext,
        {
          namespace: args.namespace,
          threadId: args.threadId,
          lastMessageId: tip._id,
          sessionId: args.sessionId,
        },
      );
      await chatActorHistory.append(ctx, {
        streamType: CHAT_ACTOR_STREAM_TYPE,
        streamId: chatActorStreamId(args.threadId, ASSISTANT_ACTOR_KEY),
        entryId: crypto.randomUUID(),
        kind: "assistantResponseComplete",
        payload: {
          threadId: args.threadId,
          actorKey: ASSISTANT_ACTOR_KEY,
          anchorMessageId: tip._id,
        } satisfies ChatActorTurnPayload,
      });
    }
    return null;
  },
});

export const continueThreadStream = internalAction({
  args: {
    threadId: v.string(),
    userId: v.string(),
    namespace: v.string(),
    ...SessionIdArg,
    promptMessageId: v.string(),
    /** Same turn as user send + optional shareMemories; streamed messages may be tagged in a follow-up. */
    turnId: v.optional(v.string()),
    toolCalls: v.optional(v.array(humanToolCallValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const turnId = args.turnId ?? "";
    await chatActorHistory.append(ctx, {
      streamType: CHAT_ACTOR_STREAM_TYPE,
      streamId: chatActorStreamId(args.threadId, args.namespace),
      entryId: crypto.randomUUID(),
      kind: "humanMessageSent",
      payload: {
        threadId: args.threadId,
        actorKey: args.namespace,
        turnId,
        anchorMessageId: args.promptMessageId,
      } satisfies ChatActorTurnPayload,
    });

    const toolCalls = filterEffectiveHumanToolCalls(args.toolCalls ?? []);
    const hasToolCalls = toolCalls.length > 0;

    const [agent] = await Promise.all([
      createAssistantAgent({
        ...ctx,
        threadId: args.threadId,
        messageId: args.promptMessageId,
        namespace: args.namespace,
        sessionId: args.sessionId,
        agentId: "assistant",
        agentName: "Assistant",
      }),
      hasToolCalls
        ? ctx.runAction(internal.chat.thread.applyHumanToolCallsForTurn, {
            threadId: args.threadId,
            userId: args.userId,
            namespace: args.namespace,
            sessionId: args.sessionId,
            promptMessageId: args.promptMessageId,
            turnId,
            toolCalls,
          })
        : Promise.resolve(null),
    ]);

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

    void ctx.scheduler.runAfter(
      0,
      internal.chat.thread.finalizeAssistantStreamTurn,
      {
        threadId: args.threadId,
        namespace: args.namespace,
        sessionId: args.sessionId,
      },
    );

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

    const result = await listMessages(ctx, components.agent, agentArgs);
    const streams = await syncStreams(ctx, components.agent, agentArgs);
    return {
      ...result,
      page: toThreadUIMessages(args.threadId, result.page),
      streams,
    };
  },
});
