import {
  vStreamArgs,
  vStreamMessagesReturnValue,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { createTerminalChatAgent } from "./llms/agents/terminalChat";

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
    const { thread } = await agent.continueThread(ctx, {
      threadId: args.threadId,
    });
    const result = await thread.streamText(
      { prompt: args.prompt },
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
