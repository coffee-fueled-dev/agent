import type {
  DocumentByName,
  FunctionArgs,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  TableNamesInDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { Doc } from "../component/_generated/dataModel.js";

type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

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
  fields: readonly FieldKeysFor<DATA_MODEL, TABLE_NAME>[];
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

type UpsertFeature<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertFeature"];

type DeleteFeature<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteFeature"];

type LexicalSearch<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["lexicalSearch"];

/** Canonical row in the component (identity + opaque `sourceRef`). */
export type LexicalSearchItemDoc = Doc<"searchFeatureItems">;

export class SearchClient<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string = string,
  NAME extends Name = Name,
> {
  constructor(
    public component: ComponentApi<NAME>,
    public config: SearchClientConfig<DATA_MODEL, SOURCE_SYSTEM>,
  ) {}

  upsertFeature = (
    ctx: RunMutationCtx,
    args: FunctionArgs<UpsertFeature<NAME>>,
  ) => ctx.runMutation(this.component.public.add.upsertFeature, args);

  deleteFeature = (
    ctx: RunMutationCtx,
    args: FunctionArgs<DeleteFeature<NAME>>,
  ) => ctx.runMutation(this.component.public.add.deleteFeature, args);

  search = (ctx: RunQueryCtx, args: FunctionArgs<LexicalSearch<NAME>>) =>
    ctx.runQuery(this.component.public.search.lexicalSearch, args);
}
