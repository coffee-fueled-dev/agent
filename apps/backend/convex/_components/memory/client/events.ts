import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component.js";

type Name = string | undefined;

type MergeMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["store"]["mergeMemory"];
type SearchMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["searchMemory"];
type RegisterStorageSourceMetadata<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["sourceMaps"]["registerStorageSourceMetadata"];

export type MemoryClientEvent<NAME extends Name = Name> =
  | {
      event: "mergeMemory";
      args: FunctionArgs<MergeMemory<NAME>>;
      result: { memoryRecordId: string; workId: string };
    }
  | {
      event: "searchMemory";
      args: FunctionArgs<SearchMemory<NAME>>;
      result: unknown;
    }
  | {
      event: "registerStorageSourceMetadata";
      args: FunctionArgs<RegisterStorageSourceMetadata<NAME>>;
      result: null;
    };

export type MemorySubscriberCallCtx =
  | Pick<GenericMutationCtx<GenericDataModel>, "runMutation" | "runQuery">
  | Pick<
      GenericActionCtx<GenericDataModel>,
      "runAction" | "runMutation" | "runQuery"
    >;

export type MemorySubscriber<NAME extends Name = Name> = (
  ctx: MemorySubscriberCallCtx,
  payload: MemoryClientEvent<NAME>,
) => void | Promise<void>;

export interface MemorySubscribable<NAME extends Name = Name> {
  subscribe(id: string, callback: MemorySubscriber<NAME>): void;
}

export async function notifyMemorySubscribers<NAME extends Name = Name>(
  subscribers: Map<string, MemorySubscriber<NAME>>,
  ctx: MemorySubscriberCallCtx,
  payload: MemoryClientEvent<NAME>,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
