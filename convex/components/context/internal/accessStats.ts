import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { memoryEvents } from "../events";

export const getObservationTimes = internalQuery({
  args: { entryIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const entryId of args.entryIds) {
      const entry = await ctx.db
        .query("contextEntries")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (entry?.observationTime) result[entryId] = entry.observationTime;
    }
    return result;
  },
});

export const HALF_LIFE = 7 * 86_400_000; // 7 days in ms

export function readTimeDecay(
  storedScore: number,
  lastAccessTime: number,
  now: number,
): number {
  const elapsed = now - lastAccessTime;
  if (elapsed <= 0) return storedScore;
  return storedScore * 2 ** (-elapsed / HALF_LIFE);
}

export const getAccessStatsBatch = internalQuery({
  args: { entryIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const [searchMetrics, viewMetrics] = await Promise.all([
      memoryEvents.metrics.getBatch(ctx, {
        name: "searchCount",
        groupKeys: args.entryIds,
      }),
      memoryEvents.metrics.getBatch(ctx, {
        name: "viewCount",
        groupKeys: args.entryIds,
      }),
    ]);

    const now = Date.now();
    const result: Record<
      string,
      { decayedScore: number; totalAccesses: number; lastAccessTime: number }
    > = {};

    for (const entryId of args.entryIds) {
      const search = searchMetrics[entryId];
      const view = viewMetrics[entryId];
      const searchCount = search?.count ?? 0;
      const viewCount = view?.count ?? 0;
      const totalAccesses = searchCount + viewCount;
      if (totalAccesses === 0) continue;

      const lastAccessTime = Math.max(
        search?.lastEventTime ?? 0,
        view?.lastEventTime ?? 0,
      );
      result[entryId] = {
        decayedScore: readTimeDecay(totalAccesses, lastAccessTime, now),
        totalAccesses,
        lastAccessTime,
      };
    }
    return result;
  },
});
