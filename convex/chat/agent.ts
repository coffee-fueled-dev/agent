import { Agent } from "@convex-dev/agent";
import type { Tool } from "ai";
import type { SessionId } from "convex-helpers/server/sessions";
import { components } from "../_generated/api";
import type { SessionActionCtx } from "../customFunctions";
import { languageModels } from "../llms/models";
import {
  createToolkitContext,
  type ToolBuilderContext,
  type ToolkitContext,
} from "../llms/tools/_libs/customFunctions";
import { type Composable, toolkit } from "../llms/tools/_libs/toolkit";
import baseInstructions from "./_instructions";
import {
  defineRegisteredMachineAgent,
  type RegisteredMachineAgent,
  recordRegisteredMachineAgentTurn,
} from "./identity";
import { contextToolkit } from "./tools";

/** Namespace only affects tool closures; static identity shape matches any real namespace. */
const STATIC_IDENTITY_NAMESPACE = "__definition__";

const staticToolkitContext: ToolkitContext = {
  runPolicyQuery: async () => true,
  runDependencyQuery: async () => {
    throw new Error("Context chat does not use dynamic toolkit dependencies");
  },
};

const chatComposedForDefinition: Composable = toolkit(
  [contextToolkit(STATIC_IDENTITY_NAMESPACE)],
  {
    name: "contextChat",
    instructions: [baseInstructions],
  },
);

export const chatAgentDefinition: RegisteredMachineAgent =
  defineRegisteredMachineAgent({
    agentId: "context-chat",
    name: "Context Chat",
    staticProps: chatComposedForDefinition.staticProps,
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
export async function createChatAgent(
  identity?: ChatAgentIdentityCtx,
): Promise<Agent<Record<string, unknown>, Record<string, Tool>>> {
  const namespace = identity?.namespace ?? STATIC_IDENTITY_NAMESPACE;
  const composed = toolkit([contextToolkit(namespace)], {
    name: "contextChat",
    instructions: [baseInstructions],
  });

  const toolkitCtx: ToolkitContext =
    identity != null && identity.sessionId != null
      ? createToolkitContext(
          { ...identity, sessionId: identity.sessionId } as ToolBuilderContext,
          { telemetry: { namespace: identity.namespace } },
        )
      : staticToolkitContext;

  const { tools, instructions, effectiveStaticProps } =
    await composed.evaluate(toolkitCtx);

  if (identity) {
    await recordRegisteredMachineAgentTurn(identity, {
      definition: chatAgentDefinition,
      runtimeStaticProps: effectiveStaticProps,
      threadId: identity.threadId,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
    });
  }

  return new Agent(components.agent, {
    name: chatAgentDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
  });
}
