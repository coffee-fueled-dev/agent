import type { PaginationOptions } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type {
  EdgeDef,
  EdgeLabel,
  EdgePropertiesArg,
  GraphConfig,
  GraphLabelArgs,
  GraphNodesGet,
  NodeDef,
  NodeGetArgs,
  NodeKeyAny,
  NodeKeyForLabel,
  NodeLabel,
  RunMutationCtx,
  RunQueryCtx,
  TypedGraphLabelDoc,
  TypedGraphNodeAny,
  TypedListLabelsReturn,
  TypedListNodesReturn,
  TypedQueryEdgesReturn,
} from "./types.js";

export { buildKnnGraph } from "@very-coffee/k-nearest-neighbors";
export { leiden } from "@very-coffee/leiden";
export { normalizeLabel } from "../component/internal/normalize.js";

export * from "./helpers.js";
export * from "./types.js";
export { graphLabelValidatorsFromConfig } from "./validators.js";

export class GraphClient<
  const N extends readonly NodeDef[],
  const E extends readonly EdgeDef[],
> {
  constructor(
    public readonly component: ComponentApi,
    public readonly config: GraphConfig<N, E>,
  ) {}

  labels = {
    upsert: async (
      ctx: RunMutationCtx,
      args: GraphLabelArgs<N, E>,
    ): Promise<null> => {
      return await ctx.runMutation(this.component.public.labels.upsertLabel, {
        type: args.type,
        value: args.value,
      });
    },

    get: async (
      ctx: RunQueryCtx,
      args: GraphLabelArgs<N, E>,
    ): Promise<TypedGraphLabelDoc<N, E> | null> => {
      return (await ctx.runQuery(this.component.public.labels.getLabel, {
        type: args.type,
        value: args.value,
      })) as TypedGraphLabelDoc<N, E> | null;
    },

    list: async (
      ctx: RunQueryCtx,
      args: { paginationOpts: PaginationOptions },
    ): Promise<TypedListLabelsReturn<N, E>> => {
      return (await ctx.runQuery(
        this.component.public.labels.listLabels,
        args,
      )) as TypedListLabelsReturn<N, E>;
    },

    /** Label strings from graph config (not the Convex `graph_labels` table). */
    staticList: <const T extends "node" | "edge">(
      type: T,
    ): T extends "node" ? readonly NodeLabel<N>[] : readonly EdgeLabel<E>[] => {
      if (type === "node") {
        return this.config.nodes.map(
          (n) => n.label,
        ) as unknown as T extends "node"
          ? readonly NodeLabel<N>[]
          : readonly EdgeLabel<E>[];
      }
      return this.config.edges.map(
        (e) => e.label,
      ) as unknown as T extends "node"
        ? readonly NodeLabel<N>[]
        : readonly EdgeLabel<E>[];
    },
  };

  nodes = {
    create: async <L extends NodeLabel<N>>(
      ctx: RunMutationCtx,
      args: { label: L; key: NodeKeyForLabel<N, L> },
    ) => {
      return await ctx.runMutation(this.component.public.nodes.createNode, {
        label: args.label,
        key: args.key as string,
      });
    },

    get: (async (ctx: RunQueryCtx, args: NodeGetArgs<N>) => {
      const label = "label" in args ? args.label : undefined;
      return (await ctx.runQuery(this.component.public.nodes.getNode, {
        key: args.key as string,
        label,
      })) as TypedGraphNodeAny<N> | null;
    }) as GraphNodesGet<N>,

    delete: async <L extends NodeLabel<N>>(
      ctx: RunMutationCtx,
      args: { label: L; key: NodeKeyForLabel<N, L> },
    ) => {
      return await ctx.runMutation(this.component.public.nodes.deleteNode, {
        label: args.label,
        key: args.key as string,
      });
    },

    list: async <L extends NodeLabel<N>>(
      ctx: RunQueryCtx,
      args: { label: L; paginationOpts: PaginationOptions },
    ): Promise<TypedListNodesReturn<N, L>> => {
      return (await ctx.runQuery(this.component.public.nodes.listNodes, {
        label: args.label,
        paginationOpts: args.paginationOpts,
      })) as TypedListNodesReturn<N, L>;
    },
  };

  private edgeDirected<L extends EdgeLabel<E>>(label: L): boolean {
    const def = this.config.edges.find((e) => e.label === label) as
      | EdgeDef
      | undefined;
    return def?.directed !== false;
  }

  edges = {
    create: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: {
        label: L;
        from: NodeKeyAny<N>;
        to: NodeKeyAny<N>;
      } & EdgePropertiesArg<E, L>,
    ) => {
      return await ctx.runMutation(this.component.public.edges.createEdge, {
        label: args.label,
        from: args.from as string,
        to: args.to as string,
        directed: this.edgeDirected(args.label),
        properties: (args as Record<string, unknown>).properties,
      });
    },

    update: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: {
        label: L;
        from: NodeKeyAny<N>;
        to: NodeKeyAny<N>;
      } & EdgePropertiesArg<E, L>,
    ) => {
      return await ctx.runMutation(this.component.public.edges.updateEdge, {
        label: args.label,
        from: args.from as string,
        to: args.to as string,
        directed: this.edgeDirected(args.label),
        properties: (args as Record<string, unknown>).properties,
      });
    },

    delete: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; from: NodeKeyAny<N>; to: NodeKeyAny<N> },
    ) => {
      return await ctx.runMutation(this.component.public.edges.deleteEdge, {
        label: args.label,
        from: args.from as string,
        to: args.to as string,
        directed: this.edgeDirected(args.label),
      });
    },

    query: async <L extends EdgeLabel<E>>(
      ctx: RunQueryCtx,
      args: {
        label: L;
        from?: NodeKeyAny<N>;
        to?: NodeKeyAny<N>;
        paginationOpts: PaginationOptions;
      },
    ) => {
      return (await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        from: args.from as string | undefined,
        to: args.to as string | undefined,
        paginationOpts: args.paginationOpts,
      })) as TypedQueryEdgesReturn<E, L>;
    },

    neighbors: async <L extends EdgeLabel<E>>(
      ctx: RunQueryCtx,
      args: {
        label: L;
        node: NodeKeyAny<N>;
        paginationOpts: PaginationOptions;
      },
    ) => {
      return (await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        node: args.node as string,
        paginationOpts: args.paginationOpts,
      })) as TypedQueryEdgesReturn<E, L>;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- available after codegen
    createBatch: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: {
        label: L;
        edges: Array<{
          from: NodeKeyAny<N>;
          to: NodeKeyAny<N>;
          properties?: Record<string, unknown>;
        }>;
      },
    ): Promise<number> => {
      return (await ctx.runMutation(
        this.component.public.edges.createEdgesBatch,
        {
          label: args.label,
          directed: this.edgeDirected(args.label),
          edges: args.edges.map((e) => ({
            from: e.from as string,
            to: e.to as string,
            properties: e.properties,
          })),
        },
      )) as number;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- available after codegen
    deleteForNode: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; nodeKey: NodeKeyAny<N>; limit?: number },
    ): Promise<{ deleted: number; hasMore: boolean }> => {
      return (await ctx.runMutation(
        this.component.public.edges.deleteEdgesForNode,
        {
          label: args.label,
          nodeKey: args.nodeKey as string,
          limit: args.limit,
        },
      )) as { deleted: number; hasMore: boolean };
    },
  };

  stats = {
    nodeCount: async (
      ctx: RunQueryCtx,
      args: { label?: NodeLabel<N> } = {},
    ) => {
      return await ctx.runQuery(this.component.public.stats.getNodeCount, {
        label: args.label,
      });
    },

    edgeCount: async (
      ctx: RunQueryCtx,
      args: { label?: EdgeLabel<E> } = {},
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

    nodeStats: async (ctx: RunQueryCtx, args: { key: NodeKeyAny<N> }) => {
      return await ctx.runQuery(this.component.public.stats.getNodeStats, {
        key: args.key as string,
      });
    },
  };
}
