import type { RegisteredAgentIdentity } from "@very-coffee/agent-identity";
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

/** App-facing facade: hashes are computed in the host; the identity component stores plain payloads. */
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
      agentId: string;
      name: string;
      staticHash: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    return await ctx.runMutation(this.registerAPI.registerAgent, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      metadata: args.metadata,
    });
  };

  registerToolDefinition = async (
    ctx: RunMutationCtx,
    args: {
      toolKey: string;
      toolHash: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    return await ctx.runMutation(this.registerAPI.registerTool, {
      toolKey: args.toolKey,
      toolHash: args.toolHash,
      metadata: args.metadata,
    });
  };

  /** Registers one agent row then each tool definition (e.g. from {@link collectToolStaticHashes}). */
  registerAgentAndTools = async (
    ctx: RunMutationCtx,
    args: {
      agentId: string;
      name: string;
      staticHash: string;
      metadata?: Record<string, unknown>;
      tools: Map<string, string> | Iterable<readonly [string, string]>;
    },
  ) => {
    await this.registerAgentDefinition(ctx, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      metadata: args.metadata,
    });
    const iterable =
      args.tools instanceof Map ? args.tools.entries() : args.tools;
    for (const [toolKey, toolHash] of iterable) {
      await this.registerToolDefinition(ctx, { toolKey, toolHash });
    }
  };

  recordAgentTurn = async (
    ctx: RunMutationCtx,
    args: {
      agentId: string;
      agentName: string;
      staticHash: string;
      runtimeHash: string;
      threadId: string;
      messageId: string;
      sessionId?: string;
      /** Tools afforded this turn (key + bottom-up static hash each). */
      tools: Array<{ toolKey: string; toolHash: string }>;
    },
  ) => {
    return await ctx.runMutation(this.recordAPI.recordTurnIdentity, {
      agentId: args.agentId,
      agentName: args.agentName,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      tools: args.tools,
    });
  };

  recordTurnForRegisteredAgent = async (
    ctx: RunMutationCtx,
    args: {
      agent: RegisteredAgentIdentity;
      runtimeHash: string;
      threadId: string;
      messageId: string;
      sessionId?: string;
      tools: Array<{ toolKey: string; toolHash: string }>;
    },
  ) => {
    return await this.recordAgentTurn(ctx, {
      agentId: args.agent.agentId,
      agentName: args.agent.name,
      staticHash: args.agent.staticHash,
      runtimeHash: args.runtimeHash,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      tools: args.tools,
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
