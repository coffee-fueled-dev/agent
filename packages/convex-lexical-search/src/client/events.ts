import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type Name = string | undefined;

type UpsertItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertItem"];
type DeleteItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteItem"];
type LexicalSearch<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["lexicalSearch"];
type AppendTextSlice<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["appendTextSlice"];

/** Full mutation ctx; cast from {@link LexicalSearchMutationCallCtx} if you need `ctx.db`. */
export type LexicalSearchMutationCtx = GenericMutationCtx<GenericDataModel>;

/** Context for lexical search mutations (`upsertItem`, `deleteItem`, `appendTextSlice`). */
export type LexicalSearchMutationCallCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

/**
 * Context accepted by {@link SearchClient.search} (queries, mutations, and actions
 * expose `runQuery` for component calls).
 */
export type LexicalSearchSearchCtx =
  | Pick<GenericQueryCtx<GenericDataModel>, "runQuery">
  | Pick<GenericActionCtx<GenericDataModel>, "runQuery">;

/** Row returned by `lexicalSearch` (component). */
export type LexicalSearchHit = {
  _creationTime: number;
  _id: string;
  bucketId?: string;
  bucketType?: string;
  namespace: string;
  propertyHits: Array<{ propKey: string; text: string }>;
  sourceRef: string;
  sourceSystem: string;
  sourceVersion?: number;
  supersededAt?: number;
  updatedAt: number;
};

export type LexicalSearchHits = LexicalSearchHit[];

export type LexicalSearchClientEvent<NAME extends Name = Name> =
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
      event: "appendTextSlice";
      args: FunctionArgs<AppendTextSlice<NAME>>;
      result: string;
    }
  | {
      event: "search";
      args: FunctionArgs<LexicalSearch<NAME>>;
      result: LexicalSearchHits;
    };

export type LexicalSearchSubscriberCtx =
  | LexicalSearchMutationCallCtx
  | LexicalSearchSearchCtx;

export type LexicalSearchSubscriber<NAME extends Name = Name> = (
  ctx: LexicalSearchSubscriberCtx,
  payload: LexicalSearchClientEvent<NAME>,
) => void | Promise<void>;

export interface LexicalSearchSubscribable<NAME extends Name = Name> {
  subscribe(id: string, callback: LexicalSearchSubscriber<NAME>): void;
}

export async function notifyLexicalSearchSubscribers<NAME extends Name = Name>(
  subscribers: Map<string, LexicalSearchSubscriber<NAME>>,
  ctx: LexicalSearchSubscriberCtx,
  payload: LexicalSearchClientEvent<NAME>,
): Promise<void> {
  for (const cb of subscribers.values()) {
    await cb(ctx, payload);
  }
}
