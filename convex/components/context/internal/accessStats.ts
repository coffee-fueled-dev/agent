import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { memoryEvents } from "../events";

export const scheduleAccessStatsFlush = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.internal.accessStats.flushAccessStats,
      {},
    );
    return null;
  },
});

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

export function applyDecay(
  oldScore: number,
  elapsed: number,
  newCount: number,
): number {
  return oldScore * 2 ** (-elapsed / HALF_LIFE) + newCount;
}

export function readTimeDecay(
  storedScore: number,
  lastAccessTime: number,
  now: number,
): number {
  const elapsed = now - lastAccessTime;
  if (elapsed <= 0) return storedScore;
  return storedScore * 2 ** (-elapsed / HALF_LIFE);
}

const FLUSH_BATCH = 200;

export const flushAccessStats = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await memoryEvents.projectors.claimOrReadCheckpoint(ctx, {
      projector: "accessStats",
      streamType: "contextMemory",
    });

    const events = await memoryEvents.projectors.listUnprocessed(ctx, {
      projector: "accessStats",
      streamType: "contextMemory",
      limit: FLUSH_BATCH,
    });

    if (events.length === 0) return null;

    const deltas = new Map<
      string,
      { searchDelta: number; viewDelta: number; namespace?: string }
    >();
    let maxSequence = 0;

    for (const event of events) {
      if (event.globalSequence > maxSequence)
        maxSequence = event.globalSequence;

      if (event.eventType !== "searched" && event.eventType !== "viewed")
        continue;

      const entryId = event.streamId;
      const existing = deltas.get(entryId) ?? {
        searchDelta: 0,
        viewDelta: 0,
      };
      if (event.eventType === "searched") existing.searchDelta++;
      else existing.viewDelta++;

      if (event.payload?.namespace)
        existing.namespace = event.payload.namespace;
      deltas.set(entryId, existing);
    }

    const now = Date.now();

    for (const [entryId, delta] of deltas) {
      const totalDelta = delta.searchDelta + delta.viewDelta;
      if (totalDelta === 0) continue;

      const existing = await ctx.db
        .query("contextAccessStats")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();

      if (existing) {
        const elapsed = now - existing.lastAccessTime;
        const newDecayed = applyDecay(
          existing.decayedScore,
          elapsed,
          totalDelta,
        );
        await ctx.db.patch(existing._id, {
          searchCount: existing.searchCount + delta.searchDelta,
          viewCount: existing.viewCount + delta.viewDelta,
          totalAccesses: existing.totalAccesses + totalDelta,
          decayedScore: newDecayed,
          lastAccessTime: now,
        });
      } else {
        await ctx.db.insert("contextAccessStats", {
          entryId,
          namespace: delta.namespace ?? "",
          searchCount: delta.searchDelta,
          viewCount: delta.viewDelta,
          totalAccesses: totalDelta,
          decayedScore: totalDelta,
          lastAccessTime: now,
        });
      }
    }

    await memoryEvents.projectors.advanceCheckpoint(ctx, {
      projector: "accessStats",
      streamType: "contextMemory",
      lastSequence: maxSequence,
    });

    if (events.length >= FLUSH_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.internal.accessStats.flushAccessStats,
        {},
      );
    }

    return null;
  },
});

export const getAccessStatsBatch = internalQuery({
  args: { entryIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result: Record<
      string,
      { decayedScore: number; totalAccesses: number; lastAccessTime: number }
    > = {};
    for (const entryId of args.entryIds) {
      const stats = await ctx.db
        .query("contextAccessStats")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (stats) {
        result[entryId] = {
          decayedScore: stats.decayedScore,
          totalAccesses: stats.totalAccesses,
          lastAccessTime: stats.lastAccessTime,
        };
      }
    }
    return result;
  },
});
