import type {
  DocumentByName,
  FunctionArgs,
  GenericDataModel,
  TableNamesInDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { Doc } from "../component/_generated/dataModel.js";
import {
  notifyVectorSearchSubscribers,
  type VectorSearchMutationCallCtx,
  type VectorSearchSearchCtx,
  type VectorSearchSubscriber,
  type VectorSearchSubscribable,
} from "./events.js";

export type * from "./events.js";

type Name = string | undefined;

type UpsertItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertItem"];

type DeleteItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteItem"];

type VectorSearch<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["vectorSearch"];

type AppendEmbeddingSlice<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["appendEmbeddingSlice"];

export type TableNameFor<DATA_MODEL extends GenericDataModel> =
  TableNamesInDataModel<DATA_MODEL>;

export type FieldKeysFor<
  DATA_MODEL extends GenericDataModel,
  TABLE_NAME extends TableNameFor<DATA_MODEL>,
> = Extract<keyof DocumentByName<DATA_MODEL, TABLE_NAME>, string>;

/** Optional documentation of which host tables feed search; not validated by the component. */
export type SearchSourceConfig<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string,
  TABLE_NAME extends TableNameFor<DATA_MODEL> = TableNameFor<DATA_MODEL>,
> = {
  sourceSystem: SOURCE_SYSTEM;
  document: TABLE_NAME;
  /** When set, documents which host table columns are mirrored; omit when search rows are slice-backed only. */
  fields?: readonly FieldKeysFor<DATA_MODEL, TABLE_NAME>[];
};

/** Union of per-table configs so `fields` is validated against the chosen `document`, not the intersection of all tables' keys. */
export type SearchSourceConfigForAnyTable<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string,
> = {
  [T in TableNameFor<DATA_MODEL>]: SearchSourceConfig<
    DATA_MODEL,
    SOURCE_SYSTEM,
    T
  >;
}[TableNameFor<DATA_MODEL>];

export type SearchClientConfig<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string = string,
> = {
  sources: readonly SearchSourceConfigForAnyTable<DATA_MODEL, SOURCE_SYSTEM>[];
};

/** Canonical row in the component (`searchItems`; identity + opaque `sourceRef`). */
export type VectorSearchItemDoc = Doc<"searchItems">;

export class SearchClient<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string = string,
  NAME extends Name = Name,
> implements VectorSearchSubscribable<NAME>
{
  private _subscribers = new Map<string, VectorSearchSubscriber<NAME>>();

  constructor(
    public component: ComponentApi<NAME>,
    public config: SearchClientConfig<DATA_MODEL, SOURCE_SYSTEM>,
  ) {}

  subscribe(id: string, callback: VectorSearchSubscriber<NAME>): void {
    this._subscribers.set(id, callback);
  }

  upsertItem = async (
    ctx: VectorSearchMutationCallCtx,
    args: FunctionArgs<UpsertItem<NAME>>,
  ) => {
    const result = await ctx.runMutation(
      this.component.public.add.upsertItem,
      args,
    );
    await notifyVectorSearchSubscribers(this._subscribers, ctx, {
      event: "upsertItem",
      args,
      result,
    });
    return result;
  };

  deleteItem = async (
    ctx: VectorSearchMutationCallCtx,
    args: FunctionArgs<DeleteItem<NAME>>,
  ) => {
    const result = await ctx.runMutation(
      this.component.public.add.deleteItem,
      args,
    );
    await notifyVectorSearchSubscribers(this._subscribers, ctx, {
      event: "deleteItem",
      args,
      result,
    });
    return result;
  };

  /**
   * k-NN vector search over stored embeddings. Requires an action context
   * (`ctx.runAction`); Convex only supports `vectorSearch` from actions.
   */
  search = async (
    ctx: VectorSearchSearchCtx,
    args: FunctionArgs<VectorSearch<NAME>>,
  ) => {
    const result = await ctx.runAction(
      this.component.public.search.vectorSearch,
      args,
    );
    await notifyVectorSearchSubscribers(this._subscribers, ctx, {
      event: "search",
      args,
      result,
    });
    return result;
  };

  appendEmbeddingSlice = async (
    ctx: VectorSearchMutationCallCtx,
    args: FunctionArgs<AppendEmbeddingSlice<NAME>>,
  ) => {
    const result = await ctx.runMutation(
      this.component.public.add.appendEmbeddingSlice,
      args,
    );
    await notifyVectorSearchSubscribers(this._subscribers, ctx, {
      event: "appendEmbeddingSlice",
      args,
      result,
    });
    return result;
  };
}
