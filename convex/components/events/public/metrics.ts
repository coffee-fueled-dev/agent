import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const incrementBatch = mutation({
  args: {
    increments: v.array(
      v.object({
        name: v.string(),
        groupKey: v.string(),
        eventTime: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const inc of args.increments) {
      const existing = await ctx.db
        .query("event_stream_metrics")
        .withIndex("by_name_key", (q) =>
          q.eq("name", inc.name).eq("groupKey", inc.groupKey),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
          lastEventTime: Math.max(existing.lastEventTime, inc.eventTime),
        });
      } else {
        await ctx.db.insert("event_stream_metrics", {
          name: inc.name,
          groupKey: inc.groupKey,
          count: 1,
          lastEventTime: inc.eventTime,
        });
      }
    }
    return null;
  },
});

export const getMetricsBatch = query({
  args: {
    name: v.string(),
    groupKeys: v.array(v.string()),
  },
  returns: v.record(
    v.string(),
    v.object({ count: v.number(), lastEventTime: v.number() }),
  ),
  handler: async (ctx, args) => {
    const result: Record<string, { count: number; lastEventTime: number }> = {};
    for (const key of args.groupKeys) {
      const metric = await ctx.db
        .query("event_stream_metrics")
        .withIndex("by_name_key", (q) =>
          q.eq("name", args.name).eq("groupKey", key),
        )
        .first();
      if (metric) {
        result[key] = {
          count: metric.count,
          lastEventTime: metric.lastEventTime,
        };
      }
    }
    return result;
  },
});
