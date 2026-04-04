import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type Name = string | undefined;

type UpsertItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertItem"];
type DeleteItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteItem"];
type VectorSearch<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["vectorSearch"];
type AppendEmbeddingSlice<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["appendEmbeddingSlice"];

/** Full mutation ctx; cast from {@link VectorSearchMutationCallCtx} if you need `ctx.db`. */
export type VectorSearchMutationCtx = GenericMutationCtx<GenericDataModel>;

/** Context for vector search mutations (`upsertItem`, `deleteItem`, `appendEmbeddingSlice`). */
export type VectorSearchMutationCallCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

/**
 * Context for {@link SearchClient.search} — `vectorSearch` is an action; use
 * `ctx.runAction` from an action handler.
 */
export type VectorSearchSearchCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction"
>;

/** Row returned by `vectorSearch` (component). */
export type VectorSearchHit = {
  _creationTime: number;
  _id: string;
  bucketId?: string;
  bucketType?: string;
  namespace: string;
  propertyHits: Array<{
    _score: number;
    propKey: string;
    sliceId: string;
  }>;
  sourceRef: string;
  sourceSystem: string;
  sourceVersion?: number;
  supersededAt?: number;
  updatedAt: number;
};

export type VectorSearchHits = VectorSearchHit[];

export type VectorSearchClientEvent<NAME extends Name = Name> =
  | {
      event: "upsertItem";
      args: FunctionArgs<UpsertItem<NAME>>;
      result: string;
    }
  | {
      event: "deleteItem";
      args: FunctionArgs<DeleteItem<NAME>>;
      result: null;
    }
  | {
      event: "appendEmbeddingSlice";
      args: FunctionArgs<AppendEmbeddingSlice<NAME>>;
      result: string;
    }
  | {
      event: "search";
      args: FunctionArgs<VectorSearch<NAME>>;
      result: VectorSearchHits;
    };

export type VectorSearchSubscriberCtx =
  | VectorSearchMutationCallCtx
  | VectorSearchSearchCtx;

export type VectorSearchSubscriber<NAME extends Name = Name> = (
  ctx: VectorSearchSubscriberCtx,
  payload: VectorSearchClientEvent<NAME>,
) => void | Promise<void>;

export interface VectorSearchSubscribable<NAME extends Name = Name> {
  subscribe(id: string, callback: VectorSearchSubscriber<NAME>): void;
}

export async function notifyVectorSearchSubscribers<NAME extends Name = Name>(
  subscribers: Map<string, VectorSearchSubscriber<NAME>>,
  ctx: VectorSearchSubscriberCtx,
  payload: VectorSearchClientEvent<NAME>,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
