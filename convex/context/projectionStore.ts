import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const pointValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textPreview: v.string(),
  mimeType: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  z: v.number(),
});

export const getJob = internalQuery({
  args: { jobId: v.id("contextProjectionJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const createJob = internalMutation({
  args: {
    namespace: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("contextProjectionJobs", {
      namespace: args.namespace,
      limit: args.limit,
      stale: false,
      createdAt: now,
      updatedAt: now,
      data: { status: "pending" },
    });
  },
});

export const markRunning = internalMutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      updatedAt: Date.now(),
      data: {
        status: "running",
        workflowId: args.workflowId,
        phase: "loading",
        loadedCount: 0,
      },
    });
  },
});

export const updatePhase = internalMutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    phase: v.union(v.literal("loading"), v.literal("projecting")),
    loadedCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.data.status !== "running") return;
    await ctx.db.patch(args.jobId, {
      updatedAt: Date.now(),
      data: {
        ...job.data,
        phase: args.phase,
        loadedCount: args.loadedCount ?? job.data.loadedCount,
      },
    });
  },
});

export const markCompleted = internalMutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    points: v.array(pointValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      stale: false,
      updatedAt: now,
      data: {
        status: "completed",
        points: args.points,
        completedAt: now,
      },
    });
  },
});

export const markFailed = internalMutation({
  args: {
    jobId: v.id("contextProjectionJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      updatedAt: now,
      data: {
        status: "failed",
        error: args.error,
        failedAt: now,
      },
    });
  },
});

export const markStale = internalMutation({
  args: { namespace: v.string() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("contextProjectionJobs")
      .withIndex("by_namespace_createdAt", (q) =>
        q.eq("namespace", args.namespace),
      )
      .collect();
    for (const job of jobs) {
      if (job.data.status === "completed" && !job.stale) {
        await ctx.db.patch(job._id, { stale: true, updatedAt: Date.now() });
      }
    }
  },
});
