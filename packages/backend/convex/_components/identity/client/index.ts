import {
  createIdentityLink,
  hashIdentityInput,
  hashToolStaticIdentity,
  type IdentityLink,
  normalizeStaticProps,
  type RegisteredAgentIdentity,
  type ToolkitResult,
} from "@very-coffee/agent-identity";
import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction"> &
  RunMutationCtx;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

/** App-facing facade: hashing runs in the outer action; the identity component only stores plain payloads. */
export class IdentityComponentClient {
  constructor(
    public component: {
      public: {
        register: Record<string, unknown>;
        record: Record<string, unknown>;
        queries: Record<string, unknown>;
      };
    },
  ) {}

  registerAgentDefinition = async (
    ctx: RunMutationCtx,
    args: {
      agent: RegisteredAgentIdentity;
      metadata?: Record<string, unknown>;
    },
  ) => {
    const staticInput = args.agent.getStaticIdentityInput();
    const staticSnapshot = normalizeStaticProps(staticInput);
    const staticHash = await hashIdentityInput(staticSnapshot);
    return await ctx.runMutation(
      this.component.public.register.registerAgent as never,
      {
        agentId: args.agent.agentId,
        name: args.agent.name,
        staticHash,
        staticSnapshot,
        metadata: args.metadata,
      } as never,
    );
  };

  registerToolDefinition = async (
    ctx: RunMutationCtx,
    args: {
      toolKey: string;
      staticProps: unknown;
      metadata?: Record<string, unknown>;
    },
  ) => {
    const staticSnapshot = normalizeStaticProps(args.staticProps);
    const toolHash = await hashToolStaticIdentity(args.staticProps);
    return await ctx.runMutation(
      this.component.public.register.registerTool as never,
      {
        toolKey: args.toolKey,
        toolHash,
        staticSnapshot,
        metadata: args.metadata,
      } as never,
    );
  };

  recordAgentTurn = async (
    ctx: RunMutationCtx,
    args: {
      agent: RegisteredAgentIdentity;
      evaluated: ToolkitResult;
      identityLink?: IdentityLink;
      threadId: string;
      messageId: string;
      sessionId?: string;
      tools?: Array<{ toolKey: string; staticProps: unknown }>;
    },
  ) => {
    const link =
      args.identityLink ??
      (await createIdentityLink(args.agent, args.evaluated, {
        includeSnapshots: true,
      }));

    const staticSnapshot = normalizeStaticProps(
      args.agent.getStaticIdentityInput(),
    );
    const runtimeSnapshot = normalizeStaticProps(
      args.agent.getRuntimeIdentityInput(args.evaluated.effectiveStaticProps),
    );

    const toolPayloads =
      args.tools == null
        ? undefined
        : await Promise.all(
            args.tools.map(async (t) => {
              const snap = normalizeStaticProps(t.staticProps);
              const toolHash = await hashToolStaticIdentity(t.staticProps);
              return { toolKey: t.toolKey, toolHash, staticSnapshot: snap };
            }),
          );

    return await ctx.runMutation(
      this.component.public.record.recordTurnIdentity as never,
      {
        agentId: link.agentId,
        agentName: link.agentName,
        staticHash: link.staticHash,
        runtimeHash: link.runtimeHash,
        staticSnapshot: link.staticSnapshot ?? staticSnapshot,
        runtimeSnapshot: link.runtimeSnapshot ?? runtimeSnapshot,
        threadId: args.threadId,
        messageId: args.messageId,
        sessionId: args.sessionId,
        tools: toolPayloads,
      } as never,
    );
  };

  getAgentRegistration = async (
    ctx: RunQueryCtx,
    args: { agentId: string },
  ) => {
    return await ctx.runQuery(
      this.component.public.queries.getAgentRegistration as never,
      args as never,
    );
  };

  getToolRegistration = async (ctx: RunQueryCtx, args: { toolKey: string }) => {
    return await ctx.runQuery(
      this.component.public.queries.getToolRegistration as never,
      args as never,
    );
  };

  getAgentVersionHistory = async (
    ctx: RunQueryCtx,
    args: { agentId: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.component.public.queries.getAgentVersionHistory as never,
      args as never,
    );
  };

  getToolVersionHistory = async (
    ctx: RunQueryCtx,
    args: { toolKey: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.component.public.queries.getToolVersionHistory as never,
      args as never,
    );
  };

  getRuntimeVersionsForStaticVersion = async (
    ctx: RunQueryCtx,
    args: { staticVersionId: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.component.public.queries.getRuntimeVersionsForStaticVersion as never,
      args as never,
    );
  };

  getTurnBinding = async (ctx: RunQueryCtx, args: { messageId: string }) => {
    return await ctx.runQuery(
      this.component.public.queries.getTurnBinding as never,
      args as never,
    );
  };

  listTurnBindingsForThread = async (
    ctx: RunQueryCtx,
    args: { threadId: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.component.public.queries.listTurnBindingsForThread as never,
      args as never,
    );
  };

  runFromAction = {
    registerAgentDefinition: (
      ctx: RunActionCtx,
      args: Parameters<IdentityComponentClient["registerAgentDefinition"]>[1],
    ) => this.registerAgentDefinition(ctx, args),
    registerToolDefinition: (
      ctx: RunActionCtx,
      args: Parameters<IdentityComponentClient["registerToolDefinition"]>[1],
    ) => this.registerToolDefinition(ctx, args),
    recordAgentTurn: (
      ctx: RunActionCtx,
      args: Parameters<IdentityComponentClient["recordAgentTurn"]>[1],
    ) => this.recordAgentTurn(ctx, args),
    getAgentRegistration: (ctx: RunActionCtx, args: { agentId: string }) =>
      this.getAgentRegistration(ctx, args),
    getToolRegistration: (ctx: RunActionCtx, args: { toolKey: string }) =>
      this.getToolRegistration(ctx, args),
    getAgentVersionHistory: (
      ctx: RunActionCtx,
      args: { agentId: string; limit?: number },
    ) => this.getAgentVersionHistory(ctx, args),
    getToolVersionHistory: (
      ctx: RunActionCtx,
      args: { toolKey: string; limit?: number },
    ) => this.getToolVersionHistory(ctx, args),
    getRuntimeVersionsForStaticVersion: (
      ctx: RunActionCtx,
      args: { staticVersionId: string; limit?: number },
    ) => this.getRuntimeVersionsForStaticVersion(ctx, args),
    getTurnBinding: (ctx: RunActionCtx, args: { messageId: string }) =>
      this.getTurnBinding(ctx, args),
    listTurnBindingsForThread: (
      ctx: RunActionCtx,
      args: { threadId: string; limit?: number },
    ) => this.listTurnBindingsForThread(ctx, args),
  };
}
