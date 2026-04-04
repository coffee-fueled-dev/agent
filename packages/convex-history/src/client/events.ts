import type { GenericDataModel, GenericMutationCtx } from "convex/server";
import type {
  AppendArgs,
  HistoryEntry,
  HistoryStreamTemplate,
} from "../types.js";

/**
 * Full Convex mutation ctx. Cast from {@link HistoryCallCtx} in mutation-only
 * subscribers if you need `ctx.db`.
 */
export type HistoryMutationCtx = GenericMutationCtx<GenericDataModel>;

/**
 * Context for history writes and subscribers (`runMutation` + `runQuery`), including actions.
 */
export type HistoryCallCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

/**
 * Discriminated payload for mutating {@link HistoryClient} APIs.
 * Narrow on `event` for `args` / `result`.
 */
export type HistoryClientEvent<
  Streams extends
    readonly HistoryStreamTemplate[] = readonly HistoryStreamTemplate[],
> = {
  event: "append";
  args: AppendArgs<Streams>;
  result: HistoryEntry<Streams>;
};

export type HistorySubscriber<
  Streams extends readonly HistoryStreamTemplate[],
> = (
  ctx: HistoryCallCtx,
  payload: HistoryClientEvent<Streams>,
) => void | Promise<void>;

export interface HistorySubscribable<
  Streams extends readonly HistoryStreamTemplate[],
> {
  subscribe(id: string, callback: HistorySubscriber<Streams>): void;
}

/** Invoke all registered subscribers (insertion order). */
export async function notifyHistorySubscribers<
  Streams extends readonly HistoryStreamTemplate[],
>(
  subscribers: Map<string, HistorySubscriber<Streams>>,
  ctx: HistoryCallCtx,
  payload: HistoryClientEvent<Streams>,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
