import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { internalMutation, mutation, query } from "../_generated/server";
import { memoryEvents } from "../events";
import { readTimeDecay } from "../internal/accessStats";
import { hasStatus } from "../internal/status";
import schema, { pointValidator } from "../schema";

export const createJob = mutation({
  args: { namespace: v.string(), limit: v.number() },
  returns: v.id("contextProjectionJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextProjectionJobs", {
      namespace: args.namespace,
      limit: args.limit,
      stale: false,
      updateTime: Date.now(),
      data: { status: "pending" },
    });
  },
});

export const getJob = query({
  args: { jobId: v.id("contextProjectionJobs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const markRunning = mutation({
  args: { jobId: v.id("contextProjectionJobs"), workflowId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      updateTime: Date.now(),
      data: {
        status: "running",
        workflowId: args.workflowId,
        phase: "loading",
        loadedCount: 0,
      },
    });
  },
});

export const updatePhase = mutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    phase: v.union(v.literal("loading"), v.literal("projecting")),
    loadedCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.data.status !== "running") return;
    await ctx.db.patch(args.jobId, {
      updateTime: Date.now(),
      data: {
        ...job.data,
        phase: args.phase,
        loadedCount: args.loadedCount ?? job.data.loadedCount,
      },
    });
  },
});

export const markCompleted = mutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    pointCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      stale: false,
      updateTime: now,
      data: {
        status: "completed",
        completionTime: now,
        pointCount: args.pointCount,
      },
    });
  },
});

export const markFailed = mutation({
  args: { jobId: v.id("contextProjectionJobs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      updateTime: now,
      data: { status: "failed", error: args.error, failureTime: now },
    });
  },
});

export const writePointsBatch = mutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    points: v.array(pointValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const p of args.points) {
      await ctx.db.insert("contextProjectionPoints", {
        jobId: args.jobId,
        entryId: p.entryId,
        key: p.key,
        title: p.title,
        textPreview: p.textPreview,
        mimeType: p.mimeType,
        x: p.x,
        y: p.y,
        z: p.z,
      });
    }
  },
});

const CLEAR_BATCH = 100;

export const clearPointsForJob = mutation({
  args: { jobId: v.id("contextProjectionJobs") },
  returns: v.object({ hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("contextProjectionPoints")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(CLEAR_BATCH);
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { hasMore: docs.length === CLEAR_BATCH };
  },
});

export const loadEmbeddingPage = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "contextEntryEmbeddings")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextEntryEmbeddings")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .paginate(args.paginationOpts);
  },
});

export const loadEntryPage = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "contextEntries")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextEntries")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .paginate(args.paginationOpts);
  },
});

export const loadCurrentEntryIdPage = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextEntryVersions")
      .withIndex("by_namespace_key", (q) => q.eq("namespace", args.namespace))
      .paginate(args.paginationOpts);
  },
});

/** @deprecated Use loadCurrentEntryIdPage and filter in the caller */
export const loadCurrentEntryIds = query({
  args: { namespace: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_namespace_key", (q) => q.eq("namespace", args.namespace))
      .collect();
    return versions
      .filter((v) => v.data.status === "current")
      .map((v) => v.entryId);
  },
});

const latestProjectionValidator = v.union(
  v.null(),
  v.object({
    jobId: v.id("contextProjectionJobs"),
    status: v.literal("completed"),
    points: v.array(pointValidator),
    completionTime: v.number(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextProjectionJobs"),
    status: v.literal("running"),
    phase: v.union(v.literal("loading"), v.literal("projecting")),
    loadedCount: v.number(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextProjectionJobs"),
    status: v.literal("failed"),
    error: v.string(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextProjectionJobs"),
    status: v.literal("pending"),
    stale: v.boolean(),
  }),
);

export const getLatestProjection = query({
  args: { namespace: v.string() },
  returns: latestProjectionValidator,
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("contextProjectionJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .first();
    if (!job) return null;
    if (hasStatus(job, "completed")) {
      const points = await ctx.db
        .query("contextProjectionPoints")
        .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
        .collect();
      const now = Date.now();
      const entryIds = [...new Set(points.map((p) => p.entryId))];
      const [searchM, viewM] = await Promise.all([
        memoryEvents.metrics.getBatch(ctx, {
          name: "searchCount",
          groupKeys: entryIds,
        }),
        memoryEvents.metrics.getBatch(ctx, {
          name: "viewCount",
          groupKeys: entryIds,
        }),
      ]);
      const statsMap = new Map<
        string,
        { decayedScore: number; totalAccesses: number; lastAccessTime: number }
      >();
      for (const id of entryIds) {
        const sc = searchM[id]?.count ?? 0;
        const vc = viewM[id]?.count ?? 0;
        const total = sc + vc;
        if (total === 0) continue;
        const last = Math.max(
          searchM[id]?.lastEventTime ?? 0,
          viewM[id]?.lastEventTime ?? 0,
        );
        statsMap.set(id, {
          decayedScore: readTimeDecay(total, last, now),
          totalAccesses: total,
          lastAccessTime: last,
        });
      }
      return {
        jobId: job._id,
        status: "completed" as const,
        points: points.map((p) => {
          const s = statsMap.get(p.entryId);
          return {
            entryId: p.entryId,
            key: p.key,
            title: p.title,
            textPreview: p.textPreview,
            mimeType: p.mimeType,
            x: p.x,
            y: p.y,
            z: p.z,
            decayedScore: s?.decayedScore,
            totalAccesses: s?.totalAccesses,
            lastAccessTime: s?.lastAccessTime,
          };
        }),
        completionTime: job.data.completionTime,
        stale: job.stale,
      };
    }
    if (hasStatus(job, "running")) {
      return {
        jobId: job._id,
        status: "running" as const,
        phase: job.data.phase,
        loadedCount: job.data.loadedCount,
        stale: job.stale,
      };
    }
    if (hasStatus(job, "failed")) {
      return {
        jobId: job._id,
        status: "failed" as const,
        error: job.data.error,
        stale: job.stale,
      };
    }
    return { jobId: job._id, status: "pending" as const, stale: job.stale };
  },
});

export const markProjectionsStale = internalMutation({
  args: { namespace: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("contextProjectionJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .collect();
    for (const job of jobs) {
      if (job.data.status === "completed" && !job.stale) {
        await ctx.db.patch(job._id, { stale: true, updateTime: Date.now() });
      }
    }
  },
});

const projectionStatusValidator = v.union(
  v.null(),
  v.object({
    status: v.literal("completed"),
    points: v.array(pointValidator),
    completionTime: v.number(),
    stale: v.boolean(),
    namespace: v.string(),
  }),
  v.object({
    status: v.literal("failed"),
    error: v.string(),
    failureTime: v.number(),
    stale: v.boolean(),
    namespace: v.string(),
  }),
  v.object({
    status: v.literal("running"),
    phase: v.union(v.literal("loading"), v.literal("projecting")),
    loadedCount: v.number(),
    stale: v.boolean(),
    namespace: v.string(),
  }),
  v.object({
    status: v.literal("pending"),
    stale: v.boolean(),
    namespace: v.string(),
  }),
);

export const getProjectionStatus = query({
  args: { jobId: v.id("contextProjectionJobs") },
  returns: projectionStatusValidator,
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    if (hasStatus(job, "completed")) {
      const points = await ctx.db
        .query("contextProjectionPoints")
        .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
        .collect();
      const now = Date.now();
      const entryIds2 = [...new Set(points.map((p) => p.entryId))];
      const [searchM2, viewM2] = await Promise.all([
        memoryEvents.metrics.getBatch(ctx, {
          name: "searchCount",
          groupKeys: entryIds2,
        }),
        memoryEvents.metrics.getBatch(ctx, {
          name: "viewCount",
          groupKeys: entryIds2,
        }),
      ]);
      const statsMap2 = new Map<
        string,
        { decayedScore: number; totalAccesses: number; lastAccessTime: number }
      >();
      for (const id of entryIds2) {
        const sc = searchM2[id]?.count ?? 0;
        const vc = viewM2[id]?.count ?? 0;
        const total = sc + vc;
        if (total === 0) continue;
        const last = Math.max(
          searchM2[id]?.lastEventTime ?? 0,
          viewM2[id]?.lastEventTime ?? 0,
        );
        statsMap2.set(id, {
          decayedScore: readTimeDecay(total, last, now),
          totalAccesses: total,
          lastAccessTime: last,
        });
      }
      return {
        status: "completed" as const,
        points: points.map((p) => {
          const s = statsMap2.get(p.entryId);
          return {
            entryId: p.entryId,
            key: p.key,
            title: p.title,
            textPreview: p.textPreview,
            mimeType: p.mimeType,
            x: p.x,
            y: p.y,
            z: p.z,
            decayedScore: s?.decayedScore,
            totalAccesses: s?.totalAccesses,
            lastAccessTime: s?.lastAccessTime,
          };
        }),
        completionTime: job.data.completionTime,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    if (hasStatus(job, "failed")) {
      return {
        status: "failed" as const,
        error: job.data.error,
        failureTime: job.data.failureTime,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    if (hasStatus(job, "running")) {
      return {
        status: "running" as const,
        phase: job.data.phase,
        loadedCount: job.data.loadedCount,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    return {
      status: "pending" as const,
      stale: job.stale,
      namespace: job.namespace,
    };
  },
});
