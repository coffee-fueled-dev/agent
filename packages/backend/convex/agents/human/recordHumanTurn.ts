import {
  type AnyComposable,
  collectToolStaticHashes,
  computeRuntimeHash,
  hashToolSpecIdentity,
} from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { identityClient } from "../../_clients/identity.js";
import { internalAction } from "../../_generated/server.js";
import type { ToolBuilderContext } from "../lib/customFunctions.js";
import { createToolkitContext } from "../lib/customFunctions.js";
import { getHumanToolkitStaticHash, humanAgentIdentity, humanTools } from "./humanToolkit.js";

type RecordHumanTurnEnqueueArgs = {
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  staticHash: string;
  runtimeHash: string;
  tools: Array<{ toolKey: string; toolHash: string }>;
};

export async function computeHumanTurnIdentity(
  ctx: ToolBuilderContext,
): Promise<RecordHumanTurnEnqueueArgs> {
  const toolkitCtx = createToolkitContext(ctx);
  const nameToStaticHash = await collectToolStaticHashes(
    humanTools as AnyComposable,
  );
  const { tools } = await humanTools.evaluate(toolkitCtx);
  const enabledNames = Object.keys(tools).sort((a, b) => a.localeCompare(b));
  const runtimeHash = await computeRuntimeHash(
    enabledNames,
    nameToStaticHash,
    tools,
  );
  const toolRefs = await Promise.all(
    enabledNames.map(async (toolKey) => {
      const spec = tools[toolKey];
      if (!spec) {
        throw new Error(`Missing evaluated tool: ${toolKey}`);
      }
      const toolHash =
        nameToStaticHash.get(toolKey) ?? (await hashToolSpecIdentity(spec));
      return { toolKey, toolHash };
    }),
  );
  const staticHash = await getHumanToolkitStaticHash();
  if (!ctx.threadId?.length) {
    throw new Error("Human turn identity requires threadId");
  }
  if (!ctx.messageId) {
    throw new Error("Human turn identity requires messageId (user message id)");
  }
  return {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
    namespace: ctx.namespace,
    staticHash,
    runtimeHash,
    tools: toolRefs,
  };
}

/**
 * Records identity for the user's message turn. Call from a scheduled action with
 * {@link ToolBuilderContext} (same as assistant {@code recordAgentTurnBackground}).
 */
export const recordHumanTurnBackground = internalAction({
  args: {
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.string(),
    namespace: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const toolCtx: ToolBuilderContext = {
      ...ctx,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      namespace: args.namespace,
      agentId: args.namespace,
      agentName: "User",
    };
    const identity = await computeHumanTurnIdentity(toolCtx);
    const agent = humanAgentIdentity(args.namespace, identity.staticHash);
    await identityClient.recordAgentTurn(ctx, {
      agentId: agent.agentId,
      agentName: agent.name,
      staticHash: identity.staticHash,
      runtimeHash: identity.runtimeHash,
      threadId: identity.threadId,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
      tools: identity.tools,
    });
    return null;
  },
});
