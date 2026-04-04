import type { GenericDataModel, GenericQueryCtx } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import {
  type FingerprintCallCtx,
  type FingerprintSubscribable,
  type FingerprintSubscriber,
  notifyFingerprintSubscribers,
  type RecordEvaluationArgs,
  type RecordEvaluationForRegisteredAgentArgs,
  type RecordTurnIdentityMutationResult,
  type RegisterAgentAndToolsArgs,
  type RegisterAgentAndToolsResult,
  type RegisterAgentArgs,
  type RegisterAgentMutationResult,
  type RegisterToolArgs,
  type RegisterToolMutationResult,
} from "./events.js";

export type * from "./events.js";

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
export class FingerprintClient implements FingerprintSubscribable {
  private _subscribers = new Map<string, FingerprintSubscriber>();

  constructor(public component: ComponentApi) {}

  subscribe(id: string, callback: FingerprintSubscriber): void {
    this._subscribers.set(id, callback);
  }

  private get registerAPI() {
    return this.component.public.register;
  }
  private get recordAPI() {
    return this.component.public.record;
  }
  private get queriesAPI() {
    return this.component.public.queries;
  }

  private _runRegisterAgent = async (
    ctx: FingerprintCallCtx,
    args: RegisterAgentArgs,
  ): Promise<RegisterAgentMutationResult> => {
    return await ctx.runMutation(this.registerAPI.registerAgent, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      metadata: args.metadata,
    });
  };

  private _runRegisterTool = async (
    ctx: FingerprintCallCtx,
    args: RegisterToolArgs,
  ): Promise<RegisterToolMutationResult> => {
    return await ctx.runMutation(this.registerAPI.registerTool, {
      toolKey: args.toolKey,
      toolHash: args.toolHash,
      metadata: args.metadata,
    });
  };

  private _runRecordTurnIdentity = async (
    ctx: FingerprintCallCtx,
    args: RecordEvaluationArgs,
  ): Promise<RecordTurnIdentityMutationResult> => {
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

  /** Register or update the **static fingerprint** row for an agent (toolkit definition hash). */
  registerAgent = async (
    ctx: FingerprintCallCtx,
    args: RegisterAgentArgs,
  ): Promise<RegisterAgentMutationResult> => {
    const result = await this._runRegisterAgent(ctx, args);
    await notifyFingerprintSubscribers(this._subscribers, ctx, {
      event: "registerAgent",
      args,
      result,
    });
    return result;
  };

  /** Register or update the **static fingerprint** row for a single tool. */
  registerTool = async (
    ctx: FingerprintCallCtx,
    args: RegisterToolArgs,
  ): Promise<RegisterToolMutationResult> => {
    const result = await this._runRegisterTool(ctx, args);
    await notifyFingerprintSubscribers(this._subscribers, ctx, {
      event: "registerTool",
      args,
      result,
    });
    return result;
  };

  /**
   * Registers one agent row then each tool row (e.g. from
   * `collectToolStaticHashes` in `@very-coffee/agent-identity`).
   */
  registerAgentAndTools = async (
    ctx: FingerprintCallCtx,
    args: RegisterAgentAndToolsArgs,
  ): Promise<void> => {
    const agent = await this._runRegisterAgent(ctx, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      metadata: args.metadata,
    });
    const tools: RegisterAgentAndToolsResult["tools"] = [];
    const iterable =
      args.tools instanceof Map ? args.tools.entries() : args.tools;
    for (const [toolKey, toolHash] of iterable) {
      const result = await this._runRegisterTool(ctx, { toolKey, toolHash });
      tools.push({ toolKey, toolHash, result });
    }
    await notifyFingerprintSubscribers(this._subscribers, ctx, {
      event: "registerAgentAndTools",
      args,
      result: { agent, tools },
    });
  };

  /**
   * Persist static + runtime fingerprints and tool refs for one evaluation,
   * keyed by `messageId` / `threadId` (your app’s correlation ids).
   * Wraps the component `recordTurnIdentity` mutation.
   */
  recordEvaluation = async (
    ctx: FingerprintCallCtx,
    args: RecordEvaluationArgs,
  ): Promise<RecordTurnIdentityMutationResult> => {
    const result = await this._runRecordTurnIdentity(ctx, args);
    await notifyFingerprintSubscribers(this._subscribers, ctx, {
      event: "recordEvaluation",
      args,
      result,
    });
    return result;
  };

  /** Same as {@link recordEvaluation} but fills agent id/name/static from `RegisteredAgentIdentity`. */
  recordEvaluationForRegisteredAgent = async (
    ctx: FingerprintCallCtx,
    args: RecordEvaluationForRegisteredAgentArgs,
  ): Promise<RecordTurnIdentityMutationResult> => {
    const recordArgs: RecordEvaluationArgs = {
      agentId: args.agent.agentId,
      agentName: args.agent.name,
      staticHash: args.agent.staticHash,
      runtimeHash: args.runtimeHash,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      tools: args.tools,
    };
    const result = await this._runRecordTurnIdentity(ctx, recordArgs);
    await notifyFingerprintSubscribers(this._subscribers, ctx, {
      event: "recordEvaluationForRegisteredAgent",
      args,
      result,
    });
    return result;
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

/**
 * @deprecated Use {@link FingerprintClient}. Alias for searchability with older “identity” naming.
 */
export { FingerprintClient as IdentityClient };
