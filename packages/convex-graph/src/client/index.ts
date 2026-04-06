import type { PaginationOptions } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type {
  EdgeDef,
  EdgeLabel,
  EdgePropertiesArg,
  GraphConfig,
  GraphLabelArgs,
  NodeDef,
  NodeLabel,
  RunMutationCtx,
  RunQueryCtx,
  TypedGraphLabelDoc,
  TypedListLabelsReturn,
  TypedQueryEdgesReturn,
} from "./types.js";

export { buildKnnGraph } from "@very-coffee/k-nearest-neighbors";
export { leiden } from "@very-coffee/leiden";
export { normalizeLabel } from "../component/internal/normalize.js";

export * from "./helpers.js";
export * from "./types.js";

export class GraphClient<
  const N extends readonly NodeDef[],
  const E extends readonly EdgeDef[],
> {
  constructor(
    public component: ComponentApi,
    public config: GraphConfig<N, E>,
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
    const def = this.config.edges.find((e) => e.label === label) as
      | EdgeDef
      | undefined;
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
      return (await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        from: args.from,
        to: args.to,
        paginationOpts: args.paginationOpts,
      })) as TypedQueryEdgesReturn<E, L>;
    },

    neighbors: async <L extends EdgeLabel<E>>(
      ctx: RunQueryCtx,
      args: { label: L; node: string; paginationOpts: PaginationOptions },
    ) => {
      return (await ctx.runQuery(this.component.public.edges.queryEdges, {
        label: args.label,
        node: args.node,
        paginationOpts: args.paginationOpts,
      })) as TypedQueryEdgesReturn<E, L>;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- available after codegen
    createBatch: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: {
        label: L;
        edges: Array<{
          from: string;
          to: string;
          properties?: Record<string, unknown>;
        }>;
      },
    ): Promise<number> => {
      return (await ctx.runMutation(
        this.component.public.edges.createEdgesBatch,
        {
          label: args.label,
          directed: this.edgeDirected(args.label),
          edges: args.edges,
        },
      )) as number;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- available after codegen
    deleteForNode: async <L extends EdgeLabel<E>>(
      ctx: RunMutationCtx,
      args: { label: L; nodeKey: string; limit?: number },
    ): Promise<{ deleted: number; hasMore: boolean }> => {
      return (await ctx.runMutation(
        this.component.public.edges.deleteEdgesForNode,
        { label: args.label, nodeKey: args.nodeKey, limit: args.limit },
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

    nodeStats: async (ctx: RunQueryCtx, args: { key: string }) => {
      return await ctx.runQuery(this.component.public.stats.getNodeStats, {
        key: args.key,
      });
    },
  };
}
