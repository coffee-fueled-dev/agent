import type {
  DocumentByName,
  FunctionArgs,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  TableNamesInDataModel,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type { Doc } from "../_generated/dataModel";

type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

export type TableNameFor<DATA_MODEL extends GenericDataModel> =
  TableNamesInDataModel<DATA_MODEL>;

export type FieldKeysFor<
  DATA_MODEL extends GenericDataModel,
  TABLE_NAME extends TableNameFor<DATA_MODEL>,
> = Extract<keyof DocumentByName<DATA_MODEL, TABLE_NAME>, string>;

export type SearchSourceConfig<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string,
  TABLE_NAME extends TableNameFor<DATA_MODEL> = TableNameFor<DATA_MODEL>,
> = {
  sourceSystem: SOURCE_SYSTEM;
  document: TABLE_NAME;
  fields: readonly FieldKeysFor<DATA_MODEL, TABLE_NAME>[];
};

export type SearchClientConfig<
  DATA_MODEL extends GenericDataModel,
  SOURCE_SYSTEM extends string = string,
> = {
  sources: readonly SearchSourceConfig<DATA_MODEL, SOURCE_SYSTEM>[];
};

type Name = string | undefined;

type UpsertFeature<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["upsertFeature"];

type DeleteFeature<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["add"]["deleteFeature"];

type SearchFeatures<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["searchFeatures"];

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

  upsertDocumentFeature = <
    TableName extends TableNameFor<DATA_MODEL>,
    FieldName extends FieldKeysFor<DATA_MODEL, TableName>,
  >(
    ctx: RunMutationCtx,
    args: Omit<FunctionArgs<UpsertFeature<NAME>>, "source" | "sourceSystem"> & {
      sourceSystem: SOURCE_SYSTEM;
      source: Extract<Doc<"searchFeatures">["source"], { kind: "document" }> & {
        document: TableName;
      };
      fields?: readonly FieldName[];
    },
  ) =>
    this.upsertFeature(ctx, {
      ...args,
      source: { ...args.source, kind: "document" },
    });

  upsertContentFeature = (
    ctx: RunMutationCtx,
    args: Omit<FunctionArgs<UpsertFeature<NAME>>, "source" | "sourceSystem"> & {
      sourceSystem: SOURCE_SYSTEM;
      source: Extract<Doc<"searchFeatures">["source"], { kind: "content" }>;
    },
  ) =>
    this.upsertFeature(ctx, {
      ...args,
      source: { ...args.source, kind: "content" },
    });

  deleteFeature = (
    ctx: RunMutationCtx,
    args: FunctionArgs<DeleteFeature<NAME>>,
  ) => ctx.runMutation(this.component.public.add.deleteFeature, args);

  search = (ctx: RunQueryCtx, args: FunctionArgs<SearchFeatures<NAME>>) =>
    ctx.runQuery(this.component.public.search.searchFeatures, args);
}
