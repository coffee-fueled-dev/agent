import {
  vStreamArgs,
  vStreamMessagesReturnValue,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import {
  createTerminalChatAgent,
  terminalChatAgentDefinition,
} from "./llms/agents/terminalChat";
import { recordRegisteredMachineAgentTurn } from "./llms/identity";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    const agent = createTerminalChatAgent();
    return await agent.createThread(ctx, {
      title: args.title,
    });
  },
});

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    order: v.number(),
    promptMessageId: v.optional(v.string()),
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    const agent = createTerminalChatAgent();
    const { messageId: promptMessageId } = await agent.saveMessage(ctx, {
      threadId: args.threadId,
      prompt: args.prompt,
    });

    await recordRegisteredMachineAgentTurn(ctx, {
      definition: terminalChatAgentDefinition,
      threadId: args.threadId,
      messageId: promptMessageId,
    });

    const { thread } = await agent.continueThread(ctx, {
      threadId: args.threadId,
    });
    const result = await thread.streamText(
      { promptMessageId },
      {
        saveStreamDeltas: { throttleMs: 50 },
      },
    );

    return {
      order: result.order,
      promptMessageId: result.promptMessageId,
      text: await result.text,
    };
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  returns: vStreamMessagesReturnValue,
  handler: async (ctx, args) => {
    const agent = createTerminalChatAgent();
    const paginated = await agent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      excludeToolMessages: true,
      statuses: ["success", "failed", "pending"],
    });
    const streams = await agent.syncStreams(ctx, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
      includeStatuses: ["streaming", "finished", "aborted"],
    });

    return { ...paginated, streams };
  },
});
