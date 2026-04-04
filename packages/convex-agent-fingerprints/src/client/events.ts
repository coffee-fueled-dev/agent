import type { RegisteredAgentIdentity } from "@very-coffee/agent-identity";
import type { GenericDataModel, GenericMutationCtx } from "convex/server";

/**
 * Full Convex mutation ctx (`db`, `runMutation`, …). When your subscriber runs
 * in the same handler as the fingerprint call, cast from {@link FingerprintCallCtx}
 * if you need `ctx.db` (e.g. mirroring into host tables in the same transaction).
 */
export type FingerprintMutationCtx = GenericMutationCtx<GenericDataModel>;

/**
 * Context passed to fingerprint mutating methods and subscribers: `runMutation` +
 * `runQuery` (mutations, component callers, and actions).
 */
export type FingerprintCallCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

/** Return shape of `registerAgent` (component). */
export type RegisterAgentMutationResult = {
  registrationId: string;
  staticVersionId: string;
  created: { registration: boolean; staticVersion: boolean };
};

/** Return shape of `registerTool` (component). */
export type RegisterToolMutationResult = {
  registrationId: string;
  toolVersionId: string;
  created: { toolRegistration: boolean; toolVersion: boolean };
};

/** Return shape of `recordTurnIdentity` (component). */
export type RecordTurnIdentityMutationResult = {
  bindingId: string;
  created: {
    binding: boolean;
    registration: boolean;
    runtimeVersion: boolean;
    staticVersion: boolean;
  };
  registrationId: string;
  runtimeVersionId: string;
  staticVersionId: string;
  toolResults: Array<{
    created: { toolRegistration: boolean; toolVersion: boolean };
    registrationId: string;
    toolHash: string;
    toolKey: string;
    toolVersionId: string;
  }>;
};

export type RegisterAgentArgs = {
  agentId: string;
  name: string;
  staticHash: string;
  metadata?: Record<string, unknown>;
};

export type RegisterToolArgs = {
  toolKey: string;
  toolHash: string;
  metadata?: Record<string, unknown>;
};

export type RegisterAgentAndToolsArgs = RegisterAgentArgs & {
  tools: Map<string, string> | Iterable<readonly [string, string]>;
};

export type RecordEvaluationArgs = {
  agentId: string;
  agentName: string;
  staticHash: string;
  runtimeHash: string;
  threadId: string;
  messageId: string;
  sessionId?: string;
  tools: Array<{ toolKey: string; toolHash: string }>;
};

export type RecordEvaluationForRegisteredAgentArgs = {
  agent: RegisteredAgentIdentity;
  runtimeHash: string;
  threadId: string;
  messageId: string;
  sessionId?: string;
  tools: Array<{ toolKey: string; toolHash: string }>;
};

export type RegisterAgentAndToolsResult = {
  agent: RegisterAgentMutationResult;
  tools: Array<{
    toolKey: string;
    toolHash: string;
    result: RegisterToolMutationResult;
  }>;
};

/**
 * Discriminated union: one variant per mutating `FingerprintClient` method.
 * Narrow on `event` to get the correct `args` and `result`.
 */
export type FingerprintClientEvent =
  | {
      event: "registerAgent";
      args: RegisterAgentArgs;
      result: RegisterAgentMutationResult;
    }
  | {
      event: "registerTool";
      args: RegisterToolArgs;
      result: RegisterToolMutationResult;
    }
  | {
      event: "registerAgentAndTools";
      args: RegisterAgentAndToolsArgs;
      result: RegisterAgentAndToolsResult;
    }
  | {
      event: "recordEvaluation";
      args: RecordEvaluationArgs;
      result: RecordTurnIdentityMutationResult;
    }
  | {
      event: "recordEvaluationForRegisteredAgent";
      args: RecordEvaluationForRegisteredAgentArgs;
      result: RecordTurnIdentityMutationResult;
    };

export type FingerprintSubscriber = (
  ctx: FingerprintCallCtx,
  payload: FingerprintClientEvent,
) => void | Promise<void>;

export interface FingerprintSubscribable {
  subscribe(id: string, callback: FingerprintSubscriber): void;
}

/** Invoke all registered subscribers (insertion order). Used by {@link FingerprintClient}. */
export async function notifyFingerprintSubscribers(
  subscribers: Map<string, FingerprintSubscriber>,
  ctx: FingerprintCallCtx,
  payload: FingerprintClientEvent,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
