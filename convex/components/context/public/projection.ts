import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { hasStatus } from "../internal/status";
import { pointValidator } from "../schema";

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
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("contextProjectionJobs"),
      _creationTime: v.number(),
      namespace: v.string(),
      limit: v.number(),
      stale: v.boolean(),
      updateTime: v.number(),
      data: v.union(
        v.object({ status: v.literal("pending") }),
        v.object({
          status: v.literal("running"),
          workflowId: v.string(),
          phase: v.union(v.literal("loading"), v.literal("projecting")),
          loadedCount: v.number(),
        }),
        v.object({
          status: v.literal("completed"),
          points: v.array(pointValidator),
          completionTime: v.number(),
        }),
        v.object({
          status: v.literal("failed"),
          error: v.string(),
          failureTime: v.number(),
        }),
      ),
    }),
  ),
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
  args: { jobId: v.id("contextProjectionJobs"), points: v.array(pointValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      stale: false,
      updateTime: now,
      data: { status: "completed", points: args.points, completionTime: now },
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

export const loadEmbeddingPage = query({
  args: {
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    items: v.array(v.object({ entryId: v.string(), embedding: v.array(v.number()) })),
    cursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .paginate({ cursor: args.cursor ?? null, numItems: args.limit });

    const items: Array<{ entryId: string; embedding: number[] }> = [];
    for (const doc of result.page) {
      const version = await ctx.db
        .query("contextEntryVersions")
        .withIndex("by_entryId", (q) => q.eq("entryId", doc.entryId))
        .first();
      if (!version || version.data.status === "current") {
        items.push({ entryId: doc.entryId, embedding: doc.embedding });
      }
    }

    return { items, cursor: result.continueCursor, isDone: result.isDone };
  },
});

export const loadEntryPage = query({
  args: {
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    numItems: v.number(),
  },
  returns: v.object({
    page: v.array(v.object({
      entryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      textPreview: v.string(),
    })),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("contextEntries")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .paginate({ cursor: args.cursor ?? null, numItems: args.numItems });
    return {
      page: result.page.map((e) => ({
        entryId: e.entryId,
        key: e.key,
        title: e.title,
        textPreview: e.textPreview,
      })),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
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
      return {
        jobId: job._id,
        status: "completed" as const,
        points: job.data.points,
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

export const markProjectionsStale = mutation({
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
      return {
        status: "completed" as const,
        points: job.data.points,
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
    return { status: "pending" as const, stale: job.stale, namespace: job.namespace };
  },
});
