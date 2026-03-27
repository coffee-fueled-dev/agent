import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, query } from "../_generated/server";
import {
  type GraphAggregateNamespace,
  graphAggregate,
} from "../internal/aggregate";
import { graphCounters } from "../internal/counters";
import { normalizeLabel } from "../internal/normalize";

function counterKey(prefix: string, label?: string) {
  return label ? `${prefix}:${label}` : prefix;
}

export const getNodeCount = query({
  args: { label: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const key = args.label
      ? counterKey("nodes", normalizeLabel(args.label))
      : counterKey("nodes");
    return await graphCounters.count(ctx, key);
  },
});

export const getEdgeCount = query({
  args: { label: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const key = args.label
      ? counterKey("edges", normalizeLabel(args.label))
      : counterKey("edges");
    return await graphCounters.count(ctx, key);
  },
});

const FLUSH_BATCH_SIZE = 100;

export const flushDegreeUpdates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("pendingDegreeUpdates")
      .take(FLUSH_BATCH_SIZE);

    if (pending.length === 0) return null;

    const accumulated = new Map<string, number>();
    for (const row of pending) {
      accumulated.set(row.nodeKey, (accumulated.get(row.nodeKey) ?? 0) + row.delta);
    }

    for (const [nodeKey, delta] of accumulated) {
      if (delta === 0) continue;
      const stats = await ctx.db
        .query("nodeStats")
        .withIndex("by_key", (q) => q.eq("key", nodeKey))
        .first();
      if (!stats) continue;
      const oldDegree = stats.totalDegree;
      const newDegree = Math.max(0, oldDegree + delta);
      if (newDegree !== oldDegree) {
        await ctx.db.patch(stats._id, { totalDegree: newDegree });
      }
    }

    for (const row of pending) {
      await ctx.db.delete(row._id);
    }

    const more = await ctx.db.query("pendingDegreeUpdates").first();
    if (more) {
      await ctx.scheduler.runAfter(0, internal.public.stats.flushDegreeUpdates, {});
    }

    return null;
  },
});

const degreeStatsValidator = v.object({
  count: v.number(),
  sum: v.number(),
  mean: v.number(),
  median: v.union(v.null(), v.number()),
  min: v.union(v.null(), v.number()),
  max: v.union(v.null(), v.number()),
});

export const getDegreeStats = query({
  args: { label: v.optional(v.string()) },
  returns: degreeStatsValidator,
  handler: async (ctx, args) => {
    const namespace: GraphAggregateNamespace = args.label
      ? ["degree", normalizeLabel(args.label)]
      : ["degree"];
    const count = await graphAggregate.count(ctx, { namespace });
    if (count === 0) {
      return { count: 0, sum: 0, mean: 0, median: null, min: null, max: null };
    }
    const sum = await graphAggregate.sum(ctx, { namespace });
    const mean = sum / count;
    const medianItem = await graphAggregate.at(ctx, Math.floor(count / 2), {
      namespace,
    });
    const minItem = await graphAggregate.min(ctx, { namespace });
    const maxItem = await graphAggregate.max(ctx, { namespace });
    return {
      count,
      sum,
      mean,
      median: medianItem?.key ?? null,
      min: minItem?.key ?? null,
      max: maxItem?.key ?? null,
    };
  },
});

export const getNodeStats = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      inDegree: v.number(),
      outDegree: v.number(),
      totalDegree: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!stats) return null;
    return {
      inDegree: stats.inDegree,
      outDegree: stats.outDegree,
      totalDegree: stats.totalDegree,
    };
  },
});
