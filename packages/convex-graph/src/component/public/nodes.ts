import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { graphCounters, nodeTotalDegreeKey } from "../internal/counters.js";
import {
  getGraphLabelId,
  getOrCreateGraphLabelId,
  graphLabelNormalizedValue,
} from "../internal/labels.js";
import { normalizeLabel } from "../internal/normalize.js";
import schema from "../schema.js";

function counterKey(prefix: string, label?: string) {
  return label ? `${prefix}:${label}` : prefix;
}

export const createNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const labelId = await getOrCreateGraphLabelId(ctx, args.label, "node");
    const existing = await ctx.db
      .query("graph_nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", labelId).eq("key", args.key),
      )
      .first();
    if (existing) return null;

    await ctx.db.insert("graph_nodes", { label: labelId, key: args.key });

    await graphCounters.inc(ctx, counterKey("nodes"));
    await graphCounters.inc(ctx, counterKey("nodes", normalized));

    return null;
  },
});

export const getNode = query({
  args: {
    key: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.union(v.null(), doc(schema, "graph_nodes")),
  handler: async (ctx, args) => {
    if (args.label) {
      const labelId = await getGraphLabelId(ctx, args.label, "node");
      if (!labelId) return null;
      return await ctx.db
        .query("graph_nodes")
        .withIndex("by_label_key", (q) =>
          q.eq("label", labelId).eq("key", args.key),
        )
        .first();
    }
    return await ctx.db
      .query("graph_nodes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

export const deleteNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const labelId = await getGraphLabelId(ctx, args.label, "node");
    if (!labelId) return null;
    const node = await ctx.db
      .query("graph_nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", labelId).eq("key", args.key),
      )
      .first();
    if (!node) return null;

    const edges = await ctx.db
      .query("graph_edges")
      .filter((q) =>
        q.or(q.eq(q.field("from"), args.key), q.eq(q.field("to"), args.key)),
      )
      .collect();

    if (edges.length > 0) {
      const normCache = new Map<Id<"graph_labels">, string>();
      const normalizedForEdgeLabel = async (id: Id<"graph_labels">) => {
        let v = normCache.get(id);
        if (v === undefined) {
          v = await graphLabelNormalizedValue(ctx, id);
          normCache.set(id, v);
        }
        return v;
      };

      const edgeLabelCounts = new Map<string, number>();
      for (const edge of edges) {
        await ctx.db.delete(edge._id);
        const nv = await normalizedForEdgeLabel(edge.label);
        edgeLabelCounts.set(nv, (edgeLabelCounts.get(nv) ?? 0) + 1);
        await graphCounters.dec(ctx, nodeTotalDegreeKey(edge.from));
        await graphCounters.dec(ctx, nodeTotalDegreeKey(edge.to));
      }

      await graphCounters.subtract(ctx, counterKey("edges"), edges.length);
      for (const [labelValue, count] of edgeLabelCounts) {
        await graphCounters.subtract(ctx, counterKey("edges", labelValue), count);
      }
    }

    await graphCounters.reset(ctx, nodeTotalDegreeKey(args.key));

    await graphCounters.dec(ctx, counterKey("nodes"));
    await graphCounters.dec(ctx, counterKey("nodes", normalized));

    await ctx.db.delete(node._id);
    return null;
  },
});

export const listNodes = query({
  args: {
    label: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "graph_nodes")),
  handler: async (ctx, args) => {
    const labelId = await getGraphLabelId(ctx, args.label, "node");
    if (!labelId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await paginator(ctx.db, schema)
      .query("graph_nodes")
      .withIndex("by_label_key", (q) => q.eq("label", labelId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** All node kinds for a single `key` (e.g. one memory id with multiple ontology labels). */
export const listNodesByKey = query({
  args: {
    key: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "graph_nodes")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("graph_nodes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
