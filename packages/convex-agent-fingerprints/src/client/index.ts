import type { RegisteredAgentIdentity } from "@very-coffee/agent-identity";
import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

/**
 * Typed facade over the **agent fingerprints** Convex component.
 *
 * Hashes are computed in the app (e.g. `@very-coffee/agent-identity`); this
 * component stores registration rows and **evaluation bindings** (static +
 * runtime tool fingerprints tied to your correlation ids such as `messageId`).
 *
 * Under the hood the component API still uses “identity” names (`recordTurnIdentity`, etc.);
 * this client uses **fingerprint** terminology in its public surface.
 */
export class FingerprintClient {
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

  /** Register or update the **static fingerprint** row for an agent (toolkit definition hash). */
  registerAgent = async (
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

  /** Register or update the **static fingerprint** row for a single tool. */
  registerTool = async (
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

  /**
   * Registers one agent row then each tool row (e.g. from
   * `collectToolStaticHashes` in `@very-coffee/agent-identity`).
   */
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
    await this.registerAgent(ctx, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      metadata: args.metadata,
    });
    const iterable =
      args.tools instanceof Map ? args.tools.entries() : args.tools;
    for (const [toolKey, toolHash] of iterable) {
      await this.registerTool(ctx, { toolKey, toolHash });
    }
  };

  /**
   * Persist static + runtime fingerprints and tool refs for one evaluation,
   * keyed by `messageId` / `threadId` (your app’s correlation ids).
   * Wraps the component `recordTurnIdentity` mutation.
   */
  recordEvaluation = async (
    ctx: RunMutationCtx,
    args: {
      agentId: string;
      agentName: string;
      staticHash: string;
      runtimeHash: string;
      threadId: string;
      messageId: string;
      sessionId?: string;
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

  /** Same as {@link recordEvaluation} but fills agent id/name/static from `RegisteredAgentIdentity`. */
  recordEvaluationForRegisteredAgent = async (
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
    return await this.recordEvaluation(ctx, {
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

  getRegisteredAgent = async (ctx: RunQueryCtx, args: { agentId: string }) => {
    return await ctx.runQuery(this.queriesAPI.getAgentRegistration, args);
  };

  getRegisteredTool = async (ctx: RunQueryCtx, args: { toolKey: string }) => {
    return await ctx.runQuery(this.queriesAPI.getToolRegistration, args);
  };

  listAgentStaticVersions = async (
    ctx: RunQueryCtx,
    args: { agentId: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getAgentVersionHistory, args);
  };

  listToolVersions = async (
    ctx: RunQueryCtx,
    args: { toolKey: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getToolVersionHistory, args);
  };

  listRuntimeVersionsForStaticVersion = async (
    ctx: RunQueryCtx,
    args: { staticVersionId: string; limit?: number },
  ) => {
    return await ctx.runQuery(
      this.queriesAPI.getRuntimeVersionsForStaticVersion,
      args,
    );
  };

  /** Binding row for the evaluation fingerprint stored for `messageId`. */
  getBindingForMessage = async (
    ctx: RunQueryCtx,
    args: { messageId: string },
  ) => {
    return await ctx.runQuery(this.queriesAPI.getTurnBinding, args);
  };

  listBindingsForThread = async (
    ctx: RunQueryCtx,
    args: { threadId: string; limit?: number },
  ) => {
    return await ctx.runQuery(this.queriesAPI.listTurnBindingsForThread, args);
  };
}
