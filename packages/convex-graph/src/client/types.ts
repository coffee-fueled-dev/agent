import type {
  FunctionReturnType,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { GenericId, Validator } from "convex/values";
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

/** Table name bound to a node kind in {@link NodeDef}. */
export type NodeTableForLabel<
  N extends readonly NodeDef[],
  L extends NodeLabel<N>,
> = Extract<N[number], { label: L }>["tableName"];

/**
 * Convex document id for the table tied to this node label (from `nodeSchema(_, label, tableName)`).
 */
export type NodeKeyForLabel<
  N extends readonly NodeDef[],
  L extends NodeLabel<N>,
> = GenericId<NodeTableForLabel<N, L>>;

/** Any node key allowed by the graph config (union when tables differ per label). */
export type NodeKeyAny<N extends readonly NodeDef[]> = {
  [L in NodeLabel<N>]: NodeKeyForLabel<N, L>;
}[NodeLabel<N>];

/** `getNode`: either lookup by raw key, or by label with a properly typed table id. */
export type NodeGetArgs<N extends readonly NodeDef[]> =
  | { key: string; label?: undefined }
  | {
      [L in NodeLabel<N>]: { label: L; key: NodeKeyForLabel<N, L> };
    }[NodeLabel<N>];

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

export type GetNodeReturn = FunctionReturnType<
  ComponentApi["public"]["nodes"]["getNode"]
>;

export type ListNodesReturn = FunctionReturnType<
  ComponentApi["public"]["nodes"]["listNodes"]
>;

type RawGraphNodeDoc = Exclude<GetNodeReturn, null>;

/** Node document from `getNode`, narrowed by graph config label and table id. */
export type TypedGraphNode<
  N extends readonly NodeDef[],
  L extends NodeLabel<N>,
> = Omit<RawGraphNodeDoc, "label" | "key"> & {
  label: L;
  key: NodeKeyForLabel<N, L>;
};

/**
 * Union of all config-narrowed node docs (when `get` is called with key only).
 * Uses tuple indices so labels stay literal; avoid `{ [L in NodeLabel<N>]: ... }` when
 * `N` widens, which maps over `string` and erases `label` to `string`.
 */
export type TypedGraphNodeAny<N extends readonly NodeDef[]> = {
  [K in keyof N]: N[K] extends NodeDef<infer L extends string, any>
    ? TypedGraphNode<N, L & NodeLabel<N>>
    : never;
}[Extract<keyof N, number>];

export type TypedListNodesReturn<
  N extends readonly NodeDef[],
  L extends NodeLabel<N>,
> = Omit<ListNodesReturn, "page"> & {
  page: Array<TypedGraphNode<N, L>>;
};

/** `GraphClient.nodes.get` — labeled lookup returns a single label; key-only returns a union. */
export type GraphNodesGet<N extends readonly NodeDef[]> = {
  <L extends NodeLabel<N>>(
    ctx: RunQueryCtx,
    args: { label: L; key: NodeKeyForLabel<N, L> },
  ): Promise<TypedGraphNode<N, L> | null>;
  (
    ctx: RunQueryCtx,
    args: { key: string; label?: undefined },
  ): Promise<TypedGraphNodeAny<N> | null>;
};
