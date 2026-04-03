import type { ToolCtx } from "@convex-dev/agent";
import type { ToolkitContext as IdentityToolkitContext } from "@very-coffee/agent-identity";
import type {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
} from "convex/server";

export type ToolPolicyArgs = {
  threadId: string;
  messageId: string;
  sessionId: string;
};

export type AgentIdentityCtx = {
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  agentId: string;
  agentName: string;
};

export type ToolBuilderContext = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
> &
  AgentIdentityCtx;

export type ConvexAgentEnv = AgentIdentityCtx &
  Pick<ToolBuilderContext, "runAction" | "runMutation"> & {
    runPolicyQuery: (
      query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
    ) => Promise<boolean>;
    runDependencyQuery: <T>(
      query: FunctionReference<"query", "internal", ToolPolicyArgs, T>,
    ) => Promise<T>;
  };

export type ToolExecutionContext = ToolCtx & AgentIdentityCtx;

export type ToolkitContext = IdentityToolkitContext<ConvexAgentEnv>;

export function createConvexAgentEnv(ctx: ToolBuilderContext): ConvexAgentEnv {
  const args: ToolPolicyArgs = {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  };
  return {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
    namespace: ctx.namespace,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
    runAction: ctx.runAction,
    runMutation: ctx.runMutation,
    runPolicyQuery: (query) => ctx.runQuery(query, args),
    runDependencyQuery: (query) => ctx.runQuery(query, args),
  };
}

export function createToolkitContext(ctx: ToolBuilderContext): ToolkitContext {
  const env = createConvexAgentEnv(ctx);
  return {
    env,
    namespace: env.namespace,
    agentId: env.agentId,
    agentName: env.agentName,
  };
}
