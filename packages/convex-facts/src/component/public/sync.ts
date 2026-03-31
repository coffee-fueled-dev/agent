import { v } from "convex/values";
import { type MutationCtx, mutation } from "../_generated/server.js";

const factItemValidator = v.object({
  entity: v.string(),
  entityType: v.string(),
  scope: v.optional(v.string()),
  state: v.optional(v.string()),
  order: v.array(v.number()),
  labels: v.array(v.string()),
  attrs: v.optional(v.any()),
});

const factEdgeValidator = v.object({
  kind: v.string(),
  from: v.string(),
  to: v.string(),
  scope: v.optional(v.string()),
  attrs: v.optional(v.any()),
});

const factPartitionValidator = v.object({
  partition: v.string(),
  scope: v.optional(v.string()),
  head: v.optional(v.string()),
  tail: v.optional(v.string()),
  count: v.number(),
  membersVersion: v.optional(v.number()),
  attrs: v.optional(v.any()),
});

async function upsertItem(
  ctx: MutationCtx,
  namespace: string,
  item: {
    entity: string;
    entityType: string;
    scope?: string;
    state?: string;
    order: number[];
    labels: string[];
    attrs?: unknown;
  },
  sourceVersion: number | undefined,
  updatedAt: number,
) {
  const existing = await ctx.db
    .query("fact_items")
    .withIndex("by_namespace_entity", (q) =>
      q.eq("namespace", namespace).eq("entity", item.entity),
    )
    .first();

  const value = {
    namespace,
    entity: item.entity,
    entityType: item.entityType,
    scope: item.scope,
    state: item.state,
    order: item.order,
    labels: item.labels,
    attrs: item.attrs,
    sourceVersion,
    updatedAt,
  };

  if (existing) {
    await ctx.db.patch(existing._id, value);
    return;
  }
  await ctx.db.insert("fact_items", value);
}

async function upsertEdge(
  ctx: MutationCtx,
  namespace: string,
  edge: {
    kind: string;
    from: string;
    to: string;
    scope?: string;
    attrs?: unknown;
  },
  sourceVersion: number | undefined,
  updatedAt: number,
) {
  const existing = await ctx.db
    .query("fact_edges")
    .withIndex("by_namespace_from_kind_to", (q) =>
      q
        .eq("namespace", namespace)
        .eq("from", edge.from)
        .eq("kind", edge.kind)
        .eq("to", edge.to),
    )
    .first();

  const value = {
    namespace,
    kind: edge.kind,
    from: edge.from,
    to: edge.to,
    scope: edge.scope,
    attrs: edge.attrs,
    sourceVersion,
    updatedAt,
  };

  if (existing) {
    await ctx.db.patch(existing._id, value);
    return;
  }
  await ctx.db.insert("fact_edges", value);
}

async function upsertPartition(
  ctx: MutationCtx,
  namespace: string,
  partition: {
    partition: string;
    scope?: string;
    head?: string;
    tail?: string;
    count: number;
    membersVersion?: number;
    attrs?: unknown;
  },
  updatedAt: number,
) {
  const existing = await ctx.db
    .query("fact_partitions")
    .withIndex("by_namespace_scope_partition", (q) =>
      q
        .eq("namespace", namespace)
        .eq("scope", partition.scope)
        .eq("partition", partition.partition),
    )
    .first();

  const value = {
    namespace,
    partition: partition.partition,
    scope: partition.scope,
    head: partition.head,
    tail: partition.tail,
    count: partition.count,
    membersVersion: partition.membersVersion,
    attrs: partition.attrs,
    updatedAt,
  };

  if (existing) {
    await ctx.db.patch(existing._id, value);
    return;
  }
  await ctx.db.insert("fact_partitions", value);
}

export const upsertFacts = mutation({
  args: {
    namespace: v.string(),
    items: v.array(factItemValidator),
    edges: v.array(factEdgeValidator),
    partitions: v.optional(v.array(factPartitionValidator)),
    version: v.optional(v.number()),
    projector: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("direct"), v.literal("event"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updatedAt = Date.now();

    for (const item of args.items) {
      await upsertItem(ctx, args.namespace, item, args.version, updatedAt);
    }

    for (const edge of args.edges) {
      await upsertEdge(ctx, args.namespace, edge, args.version, updatedAt);
    }

    for (const partition of args.partitions ?? []) {
      await upsertPartition(ctx, args.namespace, partition, updatedAt);
    }

    if (args.projector) {
      const projector = args.projector;
      const existing = await ctx.db
        .query("fact_cursors")
        .withIndex("by_projector_namespace", (q) =>
          q.eq("projector", projector).eq("namespace", args.namespace),
        )
        .first();
      const value = {
        projector: args.projector,
        namespace: args.namespace,
        cursor: args.version,
        mode: args.mode ?? "direct",
        updatedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, value);
      } else {
        await ctx.db.insert("fact_cursors", value);
      }
    }

    return null;
  },
});

export const removeFacts = mutation({
  args: {
    namespace: v.string(),
    entities: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entities = new Set(args.entities);
    for (const entity of entities) {
      const item = await ctx.db
        .query("fact_items")
        .withIndex("by_namespace_entity", (q) =>
          q.eq("namespace", args.namespace).eq("entity", entity),
        )
        .first();
      if (item) {
        await ctx.db.delete(item._id);
      }

      const outgoing = await ctx.db
        .query("fact_edges")
        .withIndex("by_namespace_from_kind_to", (q) =>
          q.eq("namespace", args.namespace).eq("from", entity),
        )
        .collect();
      for (const edge of outgoing) {
        await ctx.db.delete(edge._id);
      }

      const incoming = await ctx.db
        .query("fact_edges")
        .withIndex("by_namespace_to_kind_from", (q) =>
          q.eq("namespace", args.namespace).eq("to", entity),
        )
        .collect();
      for (const edge of incoming) {
        await ctx.db.delete(edge._id);
      }
    }

    return null;
  },
});
