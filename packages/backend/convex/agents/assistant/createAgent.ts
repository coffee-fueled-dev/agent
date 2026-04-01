import { Agent } from "@convex-dev/agent";
import { defineAgentIdentity } from "@very-coffee/agent-identity";
import { identityClient } from "../../_clients/identity.js";
import { components } from "../../_generated/api.js";
import type { ToolBuilderContext } from "../lib/customFunctions.js";
import { createToolkitContext } from "../lib/customFunctions.js";
import { languageModels } from "../lib/models.js";
import { toolkitResultForIdentity } from "../lib/toolSpecAdapter.js";
import { toolkit } from "../lib/toolkit.js";
import { toolLibrary } from "../tools/toolRegistry.js";

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
  const { tools, instructions, effectiveStaticProps } =
    await assistantTools.evaluate(toolkitCtx);

  await identityClient.recordAgentTurn(ctx, {
    agent: assistantDefinition,
    evaluated: toolkitResultForIdentity({
      tools,
      instructions,
      effectiveStaticProps,
    }),
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  });

  return new Agent(components.agent, {
    name: assistantDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
  });
}
