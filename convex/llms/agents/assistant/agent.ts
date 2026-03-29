import { Agent } from "@convex-dev/agent";
import type { Tool } from "ai";
import type { SessionId } from "convex-helpers/server/sessions";
import { components } from "../../../_generated/api";
import {
  defineRegisteredMachineAgent,
  type RegisteredMachineAgent,
  recordRegisteredMachineAgentTurn,
} from "../../../chat/identity";
import type { SessionActionCtx } from "../../../customFunctions";
import { languageModels } from "../../models";
import { toolLibrary } from "../../tools";
import { createToolkitContext } from "../../tools/_libs/customFunctions";
import { type Composable, toolkit } from "../../tools/_libs/toolkit";

const assistantTools: Composable = toolkit(
  [toolLibrary.contextManagement, toolLibrary.filesystem],
  {
    name: "assistant-tools",
  },
);

const assistantDefinition: RegisteredMachineAgent =
  defineRegisteredMachineAgent({
    agentId: "assistant",
    name: "Assistant",
    staticProps: assistantTools.staticProps,
  });

export type ChatAgentIdentityCtx = SessionActionCtx & {
  threadId: string;
  messageId: string;
  namespace: string;
  sessionId: SessionId;
};

export async function createAgent(
  identity: ChatAgentIdentityCtx,
): Promise<Agent<Record<string, unknown>, Record<string, Tool>>> {
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
