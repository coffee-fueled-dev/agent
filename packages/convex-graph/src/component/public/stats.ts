import { v } from "convex/values";
import { query } from "../_generated/server.js";
import {
  type GraphAggregateNamespace,
  graphAggregate,
} from "../internal/aggregate.js";
import { graphCounters, nodeTotalDegreeKey } from "../internal/counters.js";
import { normalizeLabel } from "../internal/normalize.js";

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
    const node = await ctx.db
      .query("graph_nodes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!node) return null;
    const totalDegree = await graphCounters.count(
      ctx,
      nodeTotalDegreeKey(args.key),
    );
    return {
      inDegree: 0,
      outDegree: 0,
      totalDegree,
    };
  },
});
