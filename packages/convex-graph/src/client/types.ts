import type {
  DataModelFromSchemaDefinition,
  FunctionReturnType,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  SchemaDefinition,
  TableNamesInDataModel,
} from "convex/server";
import type { Validator } from "convex/values";
import type { ComponentApi } from "../component/_generated/component.js";

export type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation"
>;
export type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

// ---------------------------------------------------------------------------
// Definition types
// ---------------------------------------------------------------------------

export type NodeDef<L extends string = string, T extends string = string> = {
  readonly label: L;
  readonly tableName: T;
};

export type EdgeDef<
  L extends string = string,
  V extends Validator<any, "required", any> | undefined =
    | Validator<any, "required", any>
    | undefined,
  D extends boolean = boolean,
> = {
  readonly label: L;
  readonly properties: V;
  readonly directed: D;
};

export type GraphConfig<
  N extends readonly NodeDef[],
  E extends readonly EdgeDef[],
> = {
  readonly nodes: N;
  readonly edges: E;
};

// ---------------------------------------------------------------------------
// Derived utility types
// ---------------------------------------------------------------------------

export type NodeLabel<N extends readonly NodeDef[]> = N[number]["label"];
export type EdgeLabel<E extends readonly EdgeDef[]> = E[number]["label"];

export type AllLabels<
  N extends readonly NodeDef[],
  E extends readonly EdgeDef[],
> = NodeLabel<N> | EdgeLabel<E>;

/** Args for label registry lookups that match node vs edge label literals. */
export type GraphLabelArgs<
  N extends readonly NodeDef[],
  E extends readonly EdgeDef[],
> =
  | { type: "node"; value: NodeLabel<N> }
  | { type: "edge"; value: EdgeLabel<E> };

export type TypedGraphLabelDoc<
  N extends readonly NodeDef[],
  E extends readonly EdgeDef[],
> = {
  readonly _creationTime: number;
  readonly _id: string;
  readonly displayValue: string;
} & (
  | { readonly type: "node"; readonly value: NodeLabel<N> }
  | { readonly type: "edge"; readonly value: EdgeLabel<E> }
);

export type ListLabelsReturn = FunctionReturnType<
  ComponentApi["public"]["labels"]["listLabels"]
>;

export type TypedListLabelsReturn<
  N extends readonly NodeDef[],
  E extends readonly EdgeDef[],
> = Omit<ListLabelsReturn, "page"> & {
  page: Array<TypedGraphLabelDoc<N, E>>;
};

export type EdgePropertiesArg<E extends readonly EdgeDef[], L extends string> =
  Extract<E[number], { label: L }>["properties"] extends Validator<
    infer T,
    any,
    any
  >
    ? { properties: T }
    : { properties?: Record<string, unknown> };

export type EdgeProperties<E extends readonly EdgeDef[], L extends string> =
  Extract<E[number], { label: L }>["properties"] extends Validator<
    infer T,
    "required",
    string
  >
    ? T
    : Record<string, unknown> | undefined;

export type QueryEdgesReturn = FunctionReturnType<
  ComponentApi["public"]["edges"]["queryEdges"]
>;

export type TypedEdge<
  E extends readonly EdgeDef[],
  L extends EdgeLabel<E>,
> = Omit<QueryEdgesReturn["page"][number], "label" | "properties"> & {
  label: L;
  properties: EdgeProperties<E, L>;
};

export type TypedQueryEdgesReturn<
  E extends readonly EdgeDef[],
  L extends EdgeLabel<E>,
> = Omit<QueryEdgesReturn, "page"> & {
  page: Array<TypedEdge<E, L>>;
};
