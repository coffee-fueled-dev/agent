import { v } from "convex/values";
import { query } from "../_generated/server";
import { deriveOrderedSelection } from "../internal/derive";

const orderedFactValidator = v.object({
  entity: v.string(),
  entityType: v.string(),
  scope: v.optional(v.string()),
  state: v.optional(v.string()),
  order: v.array(v.number()),
  labels: v.array(v.string()),
  attrs: v.optional(v.any()),
});

const partitionTailValidator = v.object({
  partition: v.string(),
  tail: v.union(v.string(), v.null()),
});

const derivedValidator = v.object({
  selectedIndex: v.union(v.number(), v.null()),
  lastIndex: v.union(v.number(), v.null()),
  partitionTails: v.array(
    v.object({
      partition: v.string(),
      tail: v.union(v.string(), v.null()),
      index: v.union(v.number(), v.null()),
    }),
  ),
});

function stripOrderedFact(row: {
  entity: string;
  entityType: string;
  scope?: string;
  state?: string;
  order: number[];
  labels: string[];
  attrs?: unknown;
}) {
  return {
    entity: row.entity,
    entityType: row.entityType,
    scope: row.scope,
    state: row.state,
    order: row.order,
    labels: row.labels,
    attrs: row.attrs,
  };
}

export const getPartitionTail = query({
  args: {
    namespace: v.string(),
    scope: v.optional(v.string()),
    partition: v.string(),
  },
  returns: v.union(partitionTailValidator, v.null()),
  handler: async (ctx, args) => {
    const partition =
      args.scope != null
        ? await ctx.db
            .query("fact_partitions")
            .withIndex("by_namespace_scope_partition", (q) =>
              q
                .eq("namespace", args.namespace)
                .eq("scope", args.scope)
                .eq("partition", args.partition),
            )
            .first()
        : ((
            await ctx.db
              .query("fact_partitions")
              .withIndex("by_namespace_scope_partition", (q) =>
                q.eq("namespace", args.namespace),
              )
              .collect()
          ).find(
            (row) => row.scope == null && row.partition === args.partition,
          ) ?? null);

    if (!partition) return null;
    return {
      partition: partition.partition,
      tail: partition.tail ?? null,
    };
  },
});

export const getOrderedFacts = query({
  args: {
    namespace: v.string(),
    scope: v.optional(v.string()),
    entityType: v.optional(v.string()),
  },
  returns: v.array(orderedFactValidator),
  handler: async (ctx, args) => {
    if (args.entityType != null && args.scope != null) {
      const entityType = args.entityType;
      const scope = args.scope;
      const rows = await ctx.db
        .query("fact_items")
        .withIndex("by_namespace_scope_entityType", (q) =>
          q
            .eq("namespace", args.namespace)
            .eq("scope", scope)
            .eq("entityType", entityType),
        )
        .collect();
      return rows.sort((a, b) => {
        const length = Math.max(a.order.length, b.order.length);
        for (let index = 0; index < length; index += 1) {
          const left = a.order[index] ?? 0;
          const right = b.order[index] ?? 0;
          if (left !== right) return left - right;
        }
        return 0;
      }).map(stripOrderedFact);
    }

    if (args.entityType != null) {
      const entityType = args.entityType;
      const rows = await ctx.db
        .query("fact_items")
        .withIndex("by_namespace_entityType", (q) =>
          q.eq("namespace", args.namespace).eq("entityType", entityType),
        )
        .collect();
      return rows.sort((a, b) => {
        const length = Math.max(a.order.length, b.order.length);
        for (let index = 0; index < length; index += 1) {
          const left = a.order[index] ?? 0;
          const right = b.order[index] ?? 0;
          if (left !== right) return left - right;
        }
        return 0;
      }).map(stripOrderedFact);
    }

    const rows = await ctx.db
      .query("fact_items")
      .withIndex("by_namespace_entityType", (q) =>
        q.eq("namespace", args.namespace),
      )
      .collect();
    return rows.sort((a, b) => {
      const length = Math.max(a.order.length, b.order.length);
      for (let index = 0; index < length; index += 1) {
        const left = a.order[index] ?? 0;
        const right = b.order[index] ?? 0;
        if (left !== right) return left - right;
      }
      return 0;
    }).map(stripOrderedFact);
  },
});

export const getReachableFacts = query({
  args: {
    namespace: v.string(),
    from: v.string(),
    edgeKinds: v.array(v.string()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const reachable = new Set<string>();
    for (const kind of args.edgeKinds) {
      const edges = await ctx.db
        .query("fact_edges")
        .withIndex("by_namespace_from_kind_to", (q) =>
          q
            .eq("namespace", args.namespace)
            .eq("from", args.from)
            .eq("kind", kind),
        )
        .collect();
      for (const edge of edges) {
        reachable.add(edge.to);
      }
    }
    return [...reachable];
  },
});

export const deriveSelection = query({
  args: {
    namespace: v.string(),
    scope: v.optional(v.string()),
    entityType: v.string(),
    selected: v.string(),
    partitions: v.array(v.string()),
  },
  returns: derivedValidator,
  handler: async (ctx, args) => {
    const itemPromise =
      args.scope != null
        ? ctx.db
            .query("fact_items")
            .withIndex("by_namespace_scope_entityType", (q) =>
              q
                .eq("namespace", args.namespace)
                .eq("scope", args.scope)
                .eq("entityType", args.entityType),
            )
            .collect()
        : ctx.db
            .query("fact_items")
            .withIndex("by_namespace_entityType", (q) =>
              q
                .eq("namespace", args.namespace)
                .eq("entityType", args.entityType),
            )
            .collect();

    const [items, partitions] = await Promise.all([
      itemPromise,
      Promise.all(
        args.partitions.map(async (partition) => {
          const row =
            args.scope != null
              ? await ctx.db
                  .query("fact_partitions")
                  .withIndex("by_namespace_scope_partition", (q) =>
                    q
                      .eq("namespace", args.namespace)
                      .eq("scope", args.scope)
                      .eq("partition", partition),
                  )
                  .first()
              : ((
                  await ctx.db
                    .query("fact_partitions")
                    .withIndex("by_namespace_scope_partition", (q) =>
                      q.eq("namespace", args.namespace),
                    )
                    .collect()
                ).find(
                  (candidate) =>
                    candidate.scope == null &&
                    candidate.partition === partition,
                ) ?? null);
          return {
            partition,
            tail: row?.tail,
          };
        }),
      ),
    ]);

    return deriveOrderedSelection({
      selected: args.selected,
      items,
      partitions,
    });
  },
});
