/**
 * Chat thread Convex API (`api.chat.thread.*`).
 *
 * Pipeline:
 * 1. **sendMessage** — Persist user message, `upsertChatContextRow`, schedule `continueThreadStream` and `recordHumanTurnBackground`.
 * 2. **continueThreadStream** — Append `humanMessageSent` to actor history; optionally `applyHumanToolCallsForTurn` (parallel with agent setup); `streamText`; schedule `finalizeAssistantStreamTurn`.
 * 3. **finalizeAssistantStreamTurn** — Update chat context tip and `assistantResponseComplete` actor row (off the stream critical path).
 * 4. **Reads** — `listRecentThreads`, `listThreadMessages`.
 */
import {
  createThread as createAgentThread,
  listMessages,
  saveMessages,
  syncStreams,
} from "@convex-dev/agent";
import type { StreamArgs } from "@convex-dev/agent/validators";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { components, internal } from "../_generated/api.js";
import { internalAction, mutation, query } from "../_generated/server.js";
import { createAssistantAgent } from "../agents/assistant/createAgent.js";
import { buildObservabilityPipelineHooks } from "../observability/pipelineHooks.js";
import { ensureObservabilityWiring } from "../observability/wiring.js";
import {
  ASSISTANT_ACTOR_KEY,
  CHAT_ACTOR_STREAM_TYPE,
  type ChatActorTurnPayload,
  chatActorHistory,
  chatActorStreamId,
} from "./actorHistory.js";
import { upsertChatContextRow } from "./chatContext.js";
import { executeHumanToolCallsForTurn } from "./humanAgent/executeHumanToolCallsForTurn.js";
import {
  filterEffectiveHumanToolCalls,
  humanToolCallValidator,
} from "./humanAgent/humanToolCallWire.js";
import {
  agentActionCtx,
  buildUserMessageWithFiles,
} from "./thread/buildUserMessage.js";
import { cfdTurnProviderMetadata } from "./thread/cfdTurnMeta.js";
import {
  type ListThreadMessagesPage,
  streamArgsValidator,
} from "./thread/streamArgs.js";
import { toThreadUIMessages } from "./thread/threadUiMessages.js";

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
      {
        namespace: args.namespace,
        prompt: args.prompt,
        attachments: args.attachments,
      },
    );

    const cfdMeta = cfdTurnProviderMetadata(turnId, args.threadId);

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
      internal.chat.humanAgent.recordHumanTurn.recordHumanTurnBackground,
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
        pipelineHooks: buildObservabilityPipelineHooks({
          userId: args.userId,
          threadId: args.threadId,
          messageId: args.promptMessageId,
          sessionId: args.sessionId,
          namespace: args.namespace,
          agentId: args.namespace,
        }),
      });
    const cfdMeta = cfdTurnProviderMetadata(args.turnId, args.threadId);
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
    ensureObservabilityWiring();
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
      createAssistantAgent(
        {
          ...ctx,
          threadId: args.threadId,
          messageId: args.promptMessageId,
          namespace: args.namespace,
          sessionId: args.sessionId,
          agentId: "assistant",
          agentName: "Assistant",
        },
        { userId: args.userId },
      ),
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
        saveStreamDeltas: { throttleMs: 100 },
        contextOptions: {
          searchOtherThreads: true,
        },
      },
    );

    await result.text;

    await ctx.scheduler.runAfter(
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

export const getThread = query({
  args: {
    threadId: v.string(),
    userId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      title: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId as never,
    });
    if (!thread || thread.userId !== args.userId) {
      return null;
    }
    return { _id: thread._id, title: thread.title };
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId as never,
    });
    if (!thread || thread.userId !== args.userId) {
      throw new Error("Thread not found or access denied");
    }
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: { title: args.title },
    });
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
