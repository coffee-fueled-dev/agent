import type { GenericDataModel, GenericMutationCtx } from "convex/server";

/**
 * Full Convex mutation ctx. Cast from {@link FactsCallCtx} in mutation-only
 * subscribers if you need `ctx.db`.
 */
export type FactsMutationCtx = GenericMutationCtx<GenericDataModel>;

/**
 * Context for facts writes and subscribers (`runMutation` + `runQuery`), including actions.
 */
export type FactsCallCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

/** Args for `upsertFacts` / {@link FactsClient.sync.upsert} (structural; matches component). */
export type FactsSyncUpsertArgs = {
  namespace: string;
  items: Array<{
    entity: string;
    entityType: string;
    scope?: string;
    state?: string;
    order: number[];
    labels: string[];
    attrs?: unknown;
  }>;
  edges: Array<{
    kind: string;
    from: string;
    to: string;
    scope?: string;
    attrs?: unknown;
  }>;
  partitions?: Array<{
    partition: string;
    scope?: string;
    head?: string;
    tail?: string;
    count: number;
    membersVersion?: number;
    attrs?: unknown;
  }>;
  version?: number;
  projector?: string;
  mode?: "direct" | "event";
};

export type FactsSyncRemoveArgs = {
  namespace: string;
  entities: string[];
};

/** Component mutations return `null`. */
export type FactsMutationResult = null;

/**
 * Discriminated union for mutating {@link FactsClient} APIs.
 * Narrow on `event` for `args` / `result`.
 */
export type FactsClientEvent =
  | {
      event: "syncUpsert";
      args: FactsSyncUpsertArgs;
      result: FactsMutationResult;
    }
  | {
      event: "syncRemove";
      args: FactsSyncRemoveArgs;
      result: FactsMutationResult;
    }
  | {
      event: "batchCommit";
      args: FactsSyncUpsertArgs;
      result: FactsMutationResult;
    };

export type FactsSubscriber = (
  ctx: FactsCallCtx,
  payload: FactsClientEvent,
) => void | Promise<void>;

export interface FactsSubscribable {
  subscribe(id: string, callback: FactsSubscriber): void;
}

/** Invoke all registered subscribers (insertion order). */
export async function notifyFactsSubscribers(
  subscribers: Map<string, FactsSubscriber>,
  ctx: FactsCallCtx,
  payload: FactsClientEvent,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
