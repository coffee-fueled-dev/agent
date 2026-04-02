import { Agent } from "@convex-dev/agent";
import {
  type AnyComposable,
  collectToolStaticHashes,
  computeRuntimeHash,
  defineAgentIdentity,
  hashToolSpecIdentity,
  type RegisteredAgentIdentity,
} from "@very-coffee/agent-identity";
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

export async function createAssistantAgent(ctx: ToolBuilderContext) {
  const toolkitCtx = createToolkitContext(ctx);
  const env = createConvexAgentEnv(ctx);
  const agent = await getAssistantDefinition();
  const nameToStaticHash = await collectToolStaticHashes(
    assistantTools as AnyComposable,
  );
  const { tools } = await assistantTools.evaluate(toolkitCtx);
  const enabledNames = Object.keys(tools).sort((a, b) => a.localeCompare(b));
  const runtimeHash = await computeRuntimeHash(
    enabledNames,
    nameToStaticHash,
    tools,
  );
  const toolRefs = await Promise.all(
    enabledNames.map(async (toolKey) => {
      const spec = tools[toolKey];
      const toolHash =
        nameToStaticHash.get(toolKey) ?? (await hashToolSpecIdentity(spec));
      return { toolKey, toolHash };
    }),
  );
  const enqueueArgs = {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
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

  const runtimeTools = toolSpecsToAgentTools(tools, env);

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
    await identityClient.recordAgentTurn(ctx, {
      agentId: agent.agentId,
      agentName: agent.name,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      tools: args.tools,
    });
    return null;
  },
});
