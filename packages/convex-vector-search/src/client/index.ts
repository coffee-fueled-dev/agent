import type {
  DocumentByName,
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  TableNamesInDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { Doc } from "../component/_generated/dataModel.js";

type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;

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

type Name = string | undefined;

type UpsertItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertItem"];

type DeleteItem<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteItem"];

type VectorSearch<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["vectorSearch"];

type AppendEmbeddingSlice<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["appendEmbeddingSlice"];

/** Canonical row in the component (`searchItems`; identity + opaque `sourceRef`). */
export type VectorSearchItemDoc = Doc<"searchItems">;

export class SearchClient<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string = string,
  NAME extends Name = Name,
> {
  constructor(
    public component: ComponentApi<NAME>,
    public config: SearchClientConfig<DATA_MODEL, SOURCE_SYSTEM>,
  ) {}

  upsertItem = (
    ctx: RunMutationCtx,
    args: FunctionArgs<UpsertItem<NAME>>,
  ) => ctx.runMutation(this.component.public.add.upsertItem, args);

  deleteItem = (
    ctx: RunMutationCtx,
    args: FunctionArgs<DeleteItem<NAME>>,
  ) => ctx.runMutation(this.component.public.add.deleteItem, args);

  /**
   * k-NN vector search over stored embeddings. Requires an action context
   * (`ctx.runAction`); Convex only supports `vectorSearch` from actions.
   */
  search = (ctx: RunActionCtx, args: FunctionArgs<VectorSearch<NAME>>) =>
    ctx.runAction(this.component.public.search.vectorSearch, args);

  /** Same as {@link search}. */
  vectorSearch = (ctx: RunActionCtx, args: FunctionArgs<VectorSearch<NAME>>) =>
    ctx.runAction(this.component.public.search.vectorSearch, args);

  appendEmbeddingSlice = (
    ctx: RunMutationCtx,
    args: FunctionArgs<AppendEmbeddingSlice<NAME>>,
  ) => ctx.runMutation(this.component.public.add.appendEmbeddingSlice, args);
}
