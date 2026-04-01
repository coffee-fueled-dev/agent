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
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

/** App-facing facade: hashing runs in the outer action; the identity component only stores plain payloads. */
export class IdentityClient {
  constructor(public component: ComponentApi) {}

  private get registerAPI() {
    return this.component.public.register;
  }
  private get recordAPI() {
    return this.component.public.record;
  }
  private get queriesAPI() {
    return this.component.public.queries;
  }

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
    return await ctx.runMutation(this.registerAPI.registerAgent, {
      agentId: args.agent.agentId,
      name: args.agent.name,
      staticHash,
      staticSnapshot,
      metadata: args.metadata,
    });
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
    return await ctx.runMutation(this.registerAPI.registerTool, {
      toolKey: args.toolKey,
      toolHash,
      staticSnapshot,
      metadata: args.metadata,
    });
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

    return await ctx.runMutation(this.recordAPI.recordTurnIdentity, {
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
    });
  };

  getAgentRegistration = async (
    ctx: RunQueryCtx,
    args: { agentId: string },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getAgentRegistration, args);
  };

  getToolRegistration = async (ctx: RunQueryCtx, args: { toolKey: string }) => {
    return await ctx.runQuery(this.queriesAPI.getToolRegistration, args);
  };

  getAgentVersionHistory = async (
    ctx: RunQueryCtx,
    args: { agentId: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getAgentVersionHistory, args);
  };

  getToolVersionHistory = async (
    ctx: RunQueryCtx,
    args: { toolKey: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getToolVersionHistory, args);
  };

  getRuntimeVersionsForStaticVersion = async (
    ctx: RunQueryCtx,
    args: { staticVersionId: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.queriesAPI.getRuntimeVersionsForStaticVersion,
      args,
    );
  };

  getTurnBinding = async (ctx: RunQueryCtx, args: { messageId: string }) => {
    return await ctx.runQuery(this.queriesAPI.getTurnBinding, args);
  };

  listTurnBindingsForThread = async (
    ctx: RunQueryCtx,
    args: { threadId: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.listTurnBindingsForThread, args);
  };
}
