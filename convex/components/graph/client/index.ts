import type {
  DataModelFromSchemaDefinition,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  SchemaDefinition,
  TableNamesInDataModel,
} from "convex/server";
import type { Validator } from "convex/values";
import type { ComponentApi } from "../_generated/component";

export { normalizeLabel } from "../internal/normalize";
export { buildKnnGraph } from "../lib/knn";
export { leiden } from "../lib/leiden";

type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

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

type NodeLabel<N extends readonly NodeDef[]> = N[number]["label"];
type EdgeLabel<E extends readonly EdgeDef[]> = E[number]["label"];

type AllLabels<N extends readonly NodeDef[], E extends readonly EdgeDef[]> =
  | NodeLabel<N>
  | EdgeLabel<E>;

type EdgePropertiesArg<E extends readonly EdgeDef[], L extends string> =
  Extract<E[number], { label: L }>["properties"] extends Validator<
    infer T,
    any,
    any
  >
    ? { properties: T }
    : { properties?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function nodeSchema<
  S extends SchemaDefinition<any, boolean>,
  L extends string,
  T extends TableNamesInDataModel<DataModelFromSchemaDefinition<S>> & string,
>(_schema: S, label: L, tableName: T): NodeDef<L, T> {
  void _schema;
  return { label, tableName };
}

export function edgeSchema<L extends string>(
  label: L,
): EdgeDef<L, undefined, true>;
export function edgeSchema<
  L extends string,
  V extends Validator<any, "required", any>,
>(label: L, properties: V): EdgeDef<L, V, true>;
export function edgeSchema<L extends string>(
  label: L,
  properties: undefined,
  options: { directed: false },
): EdgeDef<L, undefined, false>;
export function edgeSchema<
  L extends string,
  V extends Validator<any, "required", any>,
>(
  label: L,
  properties: V,
  options: { directed: false },
): EdgeDef<L, V, false>;
export function edgeSchema(
  label: string,
  properties?: Validator<any, "required", any>,
  options?: { directed: boolean },
): EdgeDef {
  return { label, properties, directed: options?.directed !== false };
}

// ---------------------------------------------------------------------------
// GraphClient
// ---------------------------------------------------------------------------

export class GraphClient<
  const N extends readonly NodeDef[],
  const E extends readonly EdgeDef[],
> {
  constructor(
    public component: ComponentApi,
    public config: GraphConfig<N, E>,
  ) {}

  labels = {
    upsert: async (ctx: RunMutationCtx, args: { value: AllLabels<N, E> }) => {
      return await ctx.runMutation(this.component.public.labels.upsertLabel, {
        value: args.value,
      });
    },

    get: async (ctx: RunQueryCtx, args: { value: AllLabels<N, E> }) => {
      return await ctx.runQuery(this.component.public.labels.getLabel, {
        value: args.value,
      });
    },

    list: async (
      ctx: RunQueryCtx,
      args: { paginationOpts: PaginationOptions },
    ) => {
      return await ctx.runQuery(this.component.public.labels.listLabels, args);
    },

    search: async (
      ctx: RunQueryCtx,
      args: { query: string; paginationOpts: PaginationOptions },
    ) => {
      return await ctx.runQuery(
        this.component.public.labels.searchLabels,
        args,
      );
    },
  };

  nodes = {
    create: async <L extends NodeLabel<N>>(
      ctx: RunMutationCtx,
      args: { label: L; key: string },
    ) => {
      return await ctx.runMutation(this.component.public.nodes.createNode, {
        label: args.label,
        key: args.key,
      });
    },

    get: async (
      ctx: RunQueryCtx,
      args: { key: string; label?: NodeLabel<N> },
    ) => {
      return await ctx.runQuery(this.component.public.nodes.getNode, {
        key: args.key,
        label: args.label,
      });
    },

    delete: async <L extends NodeLabel<N>>(
      ctx: RunMutationCtx,
      args: { label: L; key: string },
    ) => {
      return await ctx.runMutation(this.component.public.nodes.deleteNode, {
        label: args.label,
        key: args.key,
      });
    },

    list: async (
      ctx: RunQueryCtx,
      args: { label: NodeLabel<N>; paginationOpts: PaginationOptions },
    ) => {
      return await ctx.runQuery(this.component.public.nodes.listNodes, {
        label: args.label,
        paginationOpts: args.paginationOpts,
      });
    },
  };

  private edgeDirected<L extends EdgeLabel<E>>(label: L): boolean {
    const def = this.config.edges.find(
      (e) => e.label === label,
    ) as EdgeDef | undefined;
    return def?.directed !== false;
  }

  edges = {
    create: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; from: string; to: string } & EdgePropertiesArg<E, L>,
    ) => {
      return await ctx.runMutation(this.component.public.edges.createEdge, {
        label: args.label,
        from: args.from,
        to: args.to,
        directed: this.edgeDirected(args.label),
        properties: (args as Record<string, unknown>).properties,
      });
    },

    update: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; from: string; to: string } & EdgePropertiesArg<E, L>,
    ) => {
      return await ctx.runMutation(this.component.public.edges.updateEdge, {
        label: args.label,
        from: args.from,
        to: args.to,
        directed: this.edgeDirected(args.label),
        properties: (args as Record<string, unknown>).properties,
      });
    },

    delete: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; from: string; to: string },
    ) => {
      return await ctx.runMutation(this.component.public.edges.deleteEdge, {
        label: args.label,
        from: args.from,
        to: args.to,
        directed: this.edgeDirected(args.label),
      });
    },

    query: async <L extends EdgeLabel<E>>(
      ctx: RunQueryCtx,
      args: {
        label: L;
        from?: string;
        to?: string;
        paginationOpts: PaginationOptions;
      },
    ) => {
      return await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        from: args.from,
        to: args.to,
        paginationOpts: args.paginationOpts,
      });
    },

    neighbors: async <L extends EdgeLabel<E>>(
      ctx: RunQueryCtx,
      args: { label: L; node: string; paginationOpts: PaginationOptions },
    ) => {
      return await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        node: args.node,
        paginationOpts: args.paginationOpts,
      });
    },
  };

  stats = {
    nodeCount: async (
      ctx: RunQueryCtx,
      args: { label?: AllLabels<N, E> } = {},
    ) => {
      return await ctx.runQuery(this.component.public.stats.getNodeCount, {
        label: args.label,
      });
    },

    edgeCount: async (
      ctx: RunQueryCtx,
      args: { label?: AllLabels<N, E> } = {},
    ) => {
      return await ctx.runQuery(this.component.public.stats.getEdgeCount, {
        label: args.label,
      });
    },

    degreeStats: async (
      ctx: RunQueryCtx,
      args: { label?: EdgeLabel<E> } = {},
    ) => {
      return await ctx.runQuery(this.component.public.stats.getDegreeStats, {
        label: args.label,
      });
    },

    nodeStats: async (ctx: RunQueryCtx, args: { key: string }) => {
      return await ctx.runQuery(this.component.public.stats.getNodeStats, {
        key: args.key,
      });
    },
  };
}
