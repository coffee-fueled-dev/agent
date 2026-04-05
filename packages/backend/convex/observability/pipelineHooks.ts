import type {
  ToolPipelineHooks,
} from "@very-coffee/agent-identity";
import { internal } from "../_generated/api.js";
import type { ConvexAgentEnv } from "../agents/lib/customFunctions.js";

export function buildObservabilityPipelineHooks(params: {
  userId: string;
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  agentId?: string;
}): ToolPipelineHooks<ConvexAgentEnv> {
  return {
    onToolExecuted: async (e) => {
      await e.env.runMutation(internal.observability.append.appendToolExecuted, {
        userId: params.userId,
        threadId: params.threadId,
        messageId: params.messageId,
        sessionId: params.sessionId,
        namespace: params.namespace,
        agentId: params.agentId,
        ok: e.ok,
        toolName: e.toolName,
        input: e.input,
        output: e.output,
        error: e.error,
        durationMs: e.durationMs,
      });
    },
    onPolicyEvaluated: async (e) => {
      await e.env.runMutation(
        internal.observability.append.appendPolicyEvaluated,
        {
          userId: params.userId,
          threadId: params.threadId,
          messageId: params.messageId,
          sessionId: params.sessionId,
          namespace: params.namespace,
          agentId: params.agentId,
          ok: e.ok,
          policyId: e.policyId,
          phase: e.phase,
          toolName: e.toolName,
          composableName: e.composableName,
          error: e.error,
        },
      );
    },
  };
}
