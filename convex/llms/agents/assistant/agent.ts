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
import {
  createToolkitContext,
  type ToolkitContext,
} from "../../tools/_libs/customFunctions";
import { type Composable, toolkit } from "../../tools/_libs/toolkit";

/** Namespace only affects tool closures; static identity shape matches any real namespace. */
const STATIC_IDENTITY_NAMESPACE = "__definition__";

const staticToolkitContext: ToolkitContext = {
  runPolicyQuery: async () => false,
  runDependencyQuery: async () => {
    throw new Error("Assistant does not use dynamic toolkit dependencies");
  },
  namespace: STATIC_IDENTITY_NAMESPACE,
};

const assistantTools: Composable = toolkit(
  [toolLibrary.contextManagement, toolLibrary.filesystem],
  {
    name: "assistant-tools",
  },
);

export const assistantDefinition: RegisteredMachineAgent =
  defineRegisteredMachineAgent({
    agentId: "assistant",
    name: "Assistant",
    staticProps: assistantTools.staticProps,
  });

export type ChatAgentIdentityCtx = SessionActionCtx & {
  threadId: string;
  messageId: string;
  namespace: string;
  /** Required for tool policy + telemetry; omit only when not using session-scoped tools. */
  sessionId?: SessionId;
};

/**
 * @param identity - When set (after saveMessage), records turn identity and uses the thread's namespace for tools.
 * When omitted (createThread bootstrap, or saveMessage-only agent), uses a placeholder namespace and skips identity recording.
 */
export async function createAgent(
  identity?: ChatAgentIdentityCtx,
): Promise<Agent<Record<string, unknown>, Record<string, Tool>>> {
  const toolkitCtx: ToolkitContext =
    identity != null && identity.sessionId != null
      ? createToolkitContext({
          ...identity,
          sessionId: identity.sessionId,
          namespace: identity.namespace,
        })
      : staticToolkitContext;

  const { tools, instructions, effectiveStaticProps } =
    await assistantTools.evaluate(toolkitCtx);

  if (identity) {
    await recordRegisteredMachineAgentTurn(identity, {
      definition: assistantDefinition,
      runtimeStaticProps: effectiveStaticProps,
      threadId: identity.threadId,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
    });
  }

  return new Agent(components.agent, {
    name: assistantDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
  });
}
