import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

const projectionPointValidator = v.object({
  entryId: v.string(),
  chartId: v.string(),
  chartKey: v.string(),
  key: v.string(),
  title: v.union(v.string(), v.null()),
  sourceType: v.union(
    v.literal("text"),
    v.literal("textFile"),
    v.literal("binaryFile"),
  ),
  mimeType: v.optional(v.union(v.string(), v.null())),
  fileUrl: v.optional(v.union(v.string(), v.null())),
  x: v.number(),
  y: v.number(),
  z: v.number(),
});

export type MemoryProjectionJobDoc = Doc<"memoryProjectionJobs">;
export type MemoryProjectionJobId = Id<"memoryProjectionJobs">;

export const getMemoryProjectionJob = internalQuery({
  args: {
    jobId: v.id("memoryProjectionJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const createMemoryProjectionJob = internalMutation({
  args: {
    namespace: v.string(),
    chartIds: v.optional(v.array(v.string())),
    query: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("memoryProjectionJobs", {
      namespace: args.namespace,
      chartIds: args.chartIds ?? [],
      query: args.query?.trim() ?? "",
      limit: args.limit,
      status: "pending",
      phase: "queued",
      points: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const attachMemoryProjectionWorkflow = internalMutation({
  args: {
    jobId: v.id("memoryProjectionJobs"),
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Memory projection job ${args.jobId} was not found`);
    }
    await ctx.db.patch(args.jobId, {
      workflowId: args.workflowId,
      status: "running",
      phase: "resolvingCharts",
      updatedAt: Date.now(),
    });
  },
});

export const updateMemoryProjectionJobProgress = internalMutation({
  args: {
    jobId: v.id("memoryProjectionJobs"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    phase: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("resolvingCharts"),
        v.literal("loadingMembers"),
        v.literal("projecting"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    resolvedChartCount: v.optional(v.number()),
    loadedPointCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Memory projection job ${args.jobId} was not found`);
    }
    await ctx.db.patch(args.jobId, {
      status: args.status ?? job.status,
      phase: args.phase ?? job.phase,
      resolvedChartCount: args.resolvedChartCount ?? job.resolvedChartCount,
      loadedPointCount: args.loadedPointCount ?? job.loadedPointCount,
      updatedAt: Date.now(),
    });
  },
});

export const completeMemoryProjectionJob = internalMutation({
  args: {
    jobId: v.id("memoryProjectionJobs"),
    resolvedChartCount: v.number(),
    loadedPointCount: v.number(),
    points: v.array(projectionPointValidator),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Memory projection job ${args.jobId} was not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "completed",
      phase: "completed",
      resolvedChartCount: args.resolvedChartCount,
      loadedPointCount: args.loadedPointCount,
      points: args.points,
      lastError: null,
      completedAt: now,
      updatedAt: now,
    });
  },
});

export const failMemoryProjectionJob = internalMutation({
  args: {
    jobId: v.id("memoryProjectionJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Memory projection job ${args.jobId} was not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "failed",
      phase: "failed",
      lastError: args.error,
      failedAt: now,
      updatedAt: now,
    });
  },
});
