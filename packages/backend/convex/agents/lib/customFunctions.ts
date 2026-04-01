import type { ToolCtx } from "@convex-dev/agent";
import type {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
} from "convex/server";

export type ToolExecutionContext = ToolCtx & {
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  agentId: string;
  agentName: string;
};

export type ToolPolicyArgs = {
  threadId: string;
  messageId: string;
  sessionId: string;
};

export type ToolkitContext = {
  runPolicyQuery: (
    query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
  ) => Promise<boolean>;
  runDependencyQuery: <T>(
    query: FunctionReference<"query", "internal", ToolPolicyArgs, T>,
  ) => Promise<T>;
  namespace: string;
  agentId: string;
  agentName: string;
};

export type ToolBuilderContext = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
> &
  AgentIdentityCtx;

export type AgentIdentityCtx = {
  threadId: string;
  messageId: string;
  sessionId: string;
  namespace: string;
  agentId: string;
  agentName: string;
};

export function createToolkitContext(ctx: ToolBuilderContext): ToolkitContext {
  const args: ToolPolicyArgs = {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  };
  return {
    runPolicyQuery: (query) => ctx.runQuery(query, args),
    runDependencyQuery: (query) => ctx.runQuery(query, args),
    namespace: ctx.namespace,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
  };
}
