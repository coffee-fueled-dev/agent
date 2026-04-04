import { computeRuntimeIdentityFromEvaluation } from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { fingerprintClient } from "../../_clients/fingerprints.js";
import { internalAction } from "../../_generated/server.js";
import {
  getHumanToolkitStaticHash,
  humanAgentIdentity,
  humanTools,
} from "../../agents/human/humanToolkit.js";
import type { ToolBuilderContext } from "../../agents/lib/customFunctions.js";
import { createToolkitContext } from "../../agents/lib/customFunctions.js";

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
  const { runtimeHash, toolRefs } = await computeRuntimeIdentityFromEvaluation(
    humanTools,
    toolkitCtx,
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
    await fingerprintClient.recordEvaluationForRegisteredAgent(ctx, {
      agent,
      runtimeHash: identity.runtimeHash,
      threadId: identity.threadId,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
      tools: identity.tools,
    });
    return null;
  },
});
