import { Agent } from "@convex-dev/agent";
import { defineAgentIdentity } from "@very-coffee/agent-identity";
import { identityClient } from "../../_clients/identity.js";
import { components } from "../../_generated/api.js";
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

export async function createAssistantAgent(ctx: ToolBuilderContext) {
  const toolkitCtx = createToolkitContext(ctx);
  const env = createConvexAgentEnv(ctx);
  const { tools, instructions, effectiveStaticProps } =
    await assistantTools.evaluate(toolkitCtx);

  await identityClient.recordAgentTurn(ctx, {
    agent: assistantDefinition,
    evaluated: {
      tools,
      instructions,
      effectiveStaticProps,
    },
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  });

  const runtimeTools = toolSpecsToAgentTools(tools, env);

  return new Agent(components.agent, {
    name: assistantDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools: runtimeTools,
  });
}
