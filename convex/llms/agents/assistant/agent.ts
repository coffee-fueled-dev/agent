import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import {
  defineRegisteredMachineAgent,
  recordRegisteredMachineAgentTurn,
} from "../../../chat/identity";
import { languageModels } from "../../models";
import { toolLibrary } from "../../tools";
import {
  type AgentIdentityCtx,
  createToolkitContext,
} from "../../tools/_libs/customFunctions";
import { toolkit } from "../../tools/_libs/toolkit";

const assistantTools = toolkit(
  [toolLibrary.contextManagement, toolLibrary.filesystem],
  {
    name: "assistant-tools",
  },
);

const assistantDefinition = defineRegisteredMachineAgent({
  agentId: "assistant",
  name: "Assistant",
  staticProps: assistantTools.staticProps,
});

export async function createAgent(identity: AgentIdentityCtx) {
  const toolkitCtx = createToolkitContext({
    ...identity,
    sessionId: identity.sessionId,
    namespace: identity.namespace,
    agentId: assistantDefinition.agentId,
    agentName: assistantDefinition.name,
  });

  const { tools, instructions, effectiveStaticProps } =
    await assistantTools.evaluate(toolkitCtx);

  await recordRegisteredMachineAgentTurn(identity, {
    definition: assistantDefinition,
    runtimeStaticProps: effectiveStaticProps,
    threadId: identity.threadId,
    messageId: identity.messageId,
    sessionId: identity.sessionId,
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
