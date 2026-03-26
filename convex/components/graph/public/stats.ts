import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  type GraphAggregateNamespace,
  graphAggregate,
} from "../internal/aggregate";
import { normalizeLabel } from "../internal/normalize";

export const getNodeCount = query({
  args: { label: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const namespace: GraphAggregateNamespace = args.label
      ? ["nodes", normalizeLabel(args.label)]
      : ["nodes"];
    return await graphAggregate.count(ctx, { namespace });
  },
});

export const getEdgeCount = query({
  args: { label: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const namespace: GraphAggregateNamespace = args.label
      ? ["edges", normalizeLabel(args.label)]
      : ["edges"];
    return await graphAggregate.count(ctx, { namespace });
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
