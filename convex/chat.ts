import { listUIMessages, vStreamArgs } from "@convex-dev/agent";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import {
  createTerminalChatAgent,
  terminalChatAgentDefinition,
} from "./llms/agents/terminalChat";
import { recordRegisteredMachineAgentTurn } from "./llms/identity";
import type { UIMessage } from "./llms/uiMessage";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
  },
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
      { promptMessageId } as unknown as Parameters<typeof thread.streamText>[0],
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
  handler: async (ctx, args): Promise<PaginationResult<UIMessage>> => {
    const paginated = await listUIMessages(ctx, components.agent, args);

    // The component returns the broad library UIMessage type, but this app
    // treats it as the backend-owned message contract specialized with the
    // registered tool library.
    return paginated as PaginationResult<UIMessage>;
  },
});
