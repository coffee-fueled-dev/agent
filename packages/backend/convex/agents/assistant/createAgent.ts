import { Agent } from "@convex-dev/agent";
import {
  computeRuntimeIdentityFromEvaluation,
  defineAgentIdentity,
  mergeToolPipelineHooks,
  type RegisteredAgentIdentity,
  type ToolPipelineHooks,
} from "@very-coffee/agent-identity";
import { fingerprintClient } from "_clients/fingerprints.js";
import { components, internal } from "_generated/api.js";
import { internalAction } from "_generated/server.js";
import { v } from "convex/values";
import { buildObservabilityPipelineHooks } from "../../observability/pipelineHooks.js";
import { pool } from "../../workpool.js";
import { toolLibrary } from "../_tools/toolRegistry.js";
import type {
  ConvexAgentEnv,
  ToolBuilderContext,
} from "../lib/customFunctions.js";
import {
  createConvexAgentEnv,
  createToolkitContext,
} from "../lib/customFunctions.js";
import { languageModels } from "../lib/models.js";
import { toolkit } from "../lib/toolkit.js";
import { toolSpecsToAgentTools } from "../lib/toolSpecAdapter.js";

const assistantTools = toolkit(
  [toolLibrary.filesystem, toolLibrary.memory, toolLibrary.web],
  {
    name: "assistant-tools",
  },
);

let cachedAssistantDefinition: RegisteredAgentIdentity | undefined;

async function getAssistantDefinition(): Promise<RegisteredAgentIdentity> {
  if (!cachedAssistantDefinition) {
    const staticHash = await assistantTools.computeStaticHash();
    cachedAssistantDefinition = defineAgentIdentity({
      agentId: "assistant",
      name: "Assistant",
      staticHash,
    });
  }
  return cachedAssistantDefinition;
}

/** Workpool serializes `fnArgs` as Convex values — only strings (no toolkit / Zod trees). */
type RecordAgentTurnEnqueueArgs = {
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  staticHash: string;
  runtimeHash: string;
  tools: Array<{ toolKey: string; toolHash: string }>;
};

export async function createAssistantAgent(
  ctx: ToolBuilderContext,
  options?: {
    pipelineHooks?: ToolPipelineHooks<ConvexAgentEnv>;
    userId?: string;
  },
) {
  if (!ctx.threadId?.length) {
    throw new Error("Assistant turn requires threadId");
  }
  if (!ctx.messageId) {
    throw new Error("Assistant turn requires messageId (prompt message id)");
  }
  const threadId = ctx.threadId;
  const messageId = ctx.messageId;

  const observabilityHooks =
    options?.userId != null && options.userId !== ""
      ? buildObservabilityPipelineHooks({
          userId: options.userId,
          threadId,
          messageId,
          sessionId: ctx.sessionId,
          namespace: ctx.namespace,
          agentId: ctx.agentId,
        })
      : undefined;
  const mergedHooks = mergeToolPipelineHooks(
    observabilityHooks,
    options?.pipelineHooks,
  );
  const toolkitCtx = createToolkitContext(
    ctx,
    mergedHooks ? { pipelineHooks: mergedHooks } : undefined,
  );
  const env = createConvexAgentEnv(ctx);
  const agent = await getAssistantDefinition();
  const { runtimeHash, toolRefs, evaluatedTools } =
    await computeRuntimeIdentityFromEvaluation(assistantTools, toolkitCtx);
  const enqueueArgs = {
    threadId,
    messageId,
    sessionId: ctx.sessionId,
    namespace: ctx.namespace,
    staticHash: agent.staticHash,
    runtimeHash,
    tools: toolRefs,
  } satisfies RecordAgentTurnEnqueueArgs;
  await pool.enqueueAction(
    ctx,
    internal.agents.assistant.createAgent.recordAgentTurnBackground,
    enqueueArgs,
  );

  const runtimeTools = toolSpecsToAgentTools(evaluatedTools, env);

  return new Agent(components.agent, {
    name: agent.name,
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
    staticHash: v.string(),
    runtimeHash: v.string(),
    tools: v.array(
      v.object({
        toolKey: v.string(),
        toolHash: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await getAssistantDefinition();
    await fingerprintClient.recordEvaluationForRegisteredAgent(ctx, {
      agent,
      runtimeHash: args.runtimeHash,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      tools: args.tools,
    });
    return null;
  },
});
