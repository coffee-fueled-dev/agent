import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { graphCounters } from "../internal/counters";
import { normalizeLabel } from "../internal/normalize";
import schema from "../schema";

function counterKey(prefix: string, label?: string) {
  return label ? `${prefix}:${label}` : prefix;
}

export const createNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const existing = await ctx.db
      .query("nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", normalized).eq("key", args.key),
      )
      .first();
    if (existing) return null;

    const labelRow = await ctx.db
      .query("labels")
      .withIndex("by_value", (q) => q.eq("value", normalized))
      .first();
    if (!labelRow) {
      await ctx.db.insert("labels", {
        value: normalized,
        displayValue: args.label,
      });
    }

    await ctx.db.insert("nodes", { label: normalized, key: args.key });

    await graphCounters.inc(ctx, counterKey("nodes"));
    await graphCounters.inc(ctx, counterKey("nodes", normalized));

    const existingStats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!existingStats) {
      await ctx.db.insert("nodeStats", {
        key: args.key,
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      });
    }

    return null;
  },
});

export const getNode = query({
  args: {
    key: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.union(v.null(), doc(schema, "nodes")),
  handler: async (ctx, args) => {
    if (args.label) {
      const normalized = normalizeLabel(args.label);
      return await ctx.db
        .query("nodes")
        .withIndex("by_label_key", (q) =>
          q.eq("label", normalized).eq("key", args.key),
        )
        .first();
    }
    return await ctx.db
      .query("nodes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

export const deleteNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const node = await ctx.db
      .query("nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", normalized).eq("key", args.key),
      )
      .first();
    if (!node) return null;

    const edges = await ctx.db
      .query("edges")
      .filter((q) =>
        q.or(q.eq(q.field("from"), args.key), q.eq(q.field("to"), args.key)),
      )
      .collect();

    if (edges.length > 0) {
      const edgeLabelCounts = new Map<string, number>();
      const degreeDeltas = new Map<string, number>();
      for (const edge of edges) {
        await ctx.db.delete(edge._id);
        edgeLabelCounts.set(edge.label, (edgeLabelCounts.get(edge.label) ?? 0) + 1);
        degreeDeltas.set(edge.from, (degreeDeltas.get(edge.from) ?? 0) + 1);
        if (edge.from !== edge.to) {
          degreeDeltas.set(edge.to, (degreeDeltas.get(edge.to) ?? 0) + 1);
        }
      }

      await graphCounters.subtract(ctx, counterKey("edges"), edges.length);
      for (const [label, count] of edgeLabelCounts) {
        await graphCounters.subtract(ctx, counterKey("edges", label), count);
      }

      for (const [nodeKey, delta] of degreeDeltas) {
        if (nodeKey !== args.key) {
          await ctx.db.insert("pendingDegreeUpdates", {
            nodeKey,
            delta: -delta,
            edgeLabel: normalized,
          });
        }
      }
      if (degreeDeltas.size > 1 || !degreeDeltas.has(args.key)) {
        await ctx.scheduler.runAfter(0, internal.public.stats.flushDegreeUpdates, {});
      }
    }

    const stats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (stats) {
      await ctx.db.delete(stats._id);
    }

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
  returns: paginationResultValidator(doc(schema, "nodes")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    return await paginator(ctx.db, schema)
      .query("nodes")
      .withIndex("by_label_key", (q) => q.eq("label", normalized))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
