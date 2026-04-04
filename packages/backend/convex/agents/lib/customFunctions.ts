import type { ToolCtx } from "@convex-dev/agent";
import type { ToolkitContext as IdentityToolkitContext } from "@very-coffee/agent-identity";
import type {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
} from "convex/server";

export type ToolPolicyArgs = {
  threadId: string;
  /** Absent before any message exists in the thread (e.g. first user send). */
  messageId?: string;
  sessionId: string;
};

export type AgentIdentityCtx = {
  threadId: string;
  messageId?: string;
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

/**
 * Invoking tool handlers after {@code evaluate}:
 * {@code const { tools } = await root.evaluate(createToolkitContext(ctx));}
 * then {@code await tools[name].handler({ env, namespace, agentId, agentName }, validatedInput)}
 * with {@code env = createConvexAgentEnv(ctx)} and input validated via {@code tools[name].inputSchema}.
 */
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

/**
 * Policy-only env for {@code query} handlers: {@code runMutation}/{@code runAction} are absent.
 * Use for toolkit {@code evaluate} when serializing affordances; do not execute tool handlers here.
 */
export function createConvexAgentEnvForQuery(
  ctx: Pick<GenericQueryCtx<GenericDataModel>, "runQuery">,
  identity: AgentIdentityCtx,
): ConvexAgentEnv {
  const args: ToolPolicyArgs = {
    threadId: identity.threadId,
    messageId: identity.messageId,
    sessionId: identity.sessionId,
  };
  return {
    ...identity,
    runAction: async () => {
      throw new Error("runAction is not available in query evaluation");
    },
    runMutation: async () => {
      throw new Error("runMutation is not available in query evaluation");
    },
    runPolicyQuery: (query) => ctx.runQuery(query, args),
    runDependencyQuery: (query) => ctx.runQuery(query, args),
  };
}

export function createHumanToolkitContextFromQuery(
  ctx: Pick<GenericQueryCtx<GenericDataModel>, "runQuery">,
  args: {
    threadId: string;
    messageId?: string;
    sessionId: string;
    namespace: string;
  },
): ToolkitContext {
  const identity: AgentIdentityCtx = {
    threadId: args.threadId,
    messageId: args.messageId,
    sessionId: args.sessionId,
    namespace: args.namespace,
    agentId: args.namespace,
    agentName: "User",
  };
  const env = createConvexAgentEnvForQuery(ctx, identity);
  return {
    env,
    namespace: env.namespace,
    agentId: env.agentId,
    agentName: env.agentName,
  };
}

/**
 * Adapter: persisted chat row + ids → {@link ToolBuilderContext} for actions / internal evaluation.
 */
export function adaptToHumanToolBuilderContext(
  ctx: Pick<
    GenericActionCtx<GenericDataModel>,
    "runQuery" | "runMutation" | "runAction"
  >,
  args: {
    threadId: string;
    messageId?: string;
    sessionId: string;
    namespace: string;
  },
): ToolBuilderContext {
  return {
    ...ctx,
    threadId: args.threadId,
    messageId: args.messageId,
    sessionId: args.sessionId,
    namespace: args.namespace,
    agentId: args.namespace,
    agentName: "User",
  };
}
