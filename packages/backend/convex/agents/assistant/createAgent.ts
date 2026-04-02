import { Agent } from "@convex-dev/agent";
import { defineAgentIdentity } from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { identityClient } from "../../_clients/identity.js";
import { components, internal } from "../../_generated/api.js";
import { internalAction } from "../../_generated/server.js";
import { pool } from "../../workpool.js";
import { toolLibrary } from "../_tools/toolRegistry.js";
import type { ToolBuilderContext } from "../lib/customFunctions.js";
import {
  createConvexAgentEnv,
  createToolkitContext,
} from "../lib/customFunctions.js";
import { languageModels } from "../lib/models.js";
import { toolkit } from "../lib/toolkit.js";
import { toolSpecsToAgentTools } from "../lib/toolSpecAdapter.js";

const assistantTools = toolkit([toolLibrary.memory, toolLibrary.filesystem], {
  name: "assistant-tools",
});

const assistantDefinition = defineAgentIdentity({
  agentId: "assistant",
  name: "Assistant",
  staticProps: assistantTools.staticProps,
});

const recordAgentTurnBackgroundRef =
  internal.agents.assistant.createAgent.recordAgentTurnBackground;

export async function createAssistantAgent(ctx: ToolBuilderContext) {
  const toolkitCtx = createToolkitContext(ctx);
  const env = createConvexAgentEnv(ctx);
  const { tools } = await assistantTools.evaluate(toolkitCtx);
  await pool.enqueueAction(ctx, recordAgentTurnBackgroundRef, {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
    namespace: ctx.namespace,
  });

  const runtimeTools = toolSpecsToAgentTools(tools, env);

  return new Agent(components.agent, {
    name: assistantDefinition.name,
    instructions: "",
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools: runtimeTools,
  });
}

export const recordAgentTurnBackground = internalAction({
  args: {
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.string(),
    namespace: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const toolkitCtx = createToolkitContext({
      ...ctx,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      namespace: args.namespace,
      agentId: assistantDefinition.agentId,
      agentName: assistantDefinition.name,
    });
    const { tools, instructions, effectiveStaticProps } =
      await assistantTools.evaluate(toolkitCtx);

    await identityClient.recordAgentTurn(ctx, {
      agent: assistantDefinition,
      evaluated: {
        tools,
        instructions,
        effectiveStaticProps,
      },
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
    });
    return null;
  },
});
