import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { graph } from "../graph";
import { hasStatus } from "../internal/status";

export const createJob = mutation({
  args: {
    namespace: v.string(),
    params: v.object({ k: v.number(), resolution: v.number() }),
  },
  returns: v.id("contextCommunityJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextCommunityJobs", {
      namespace: args.namespace,
      stale: false,
      updateTime: Date.now(),
      params: args.params,
      data: { status: "pending" },
    });
  },
});

export const getJob = query({
  args: { jobId: v.id("contextCommunityJobs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const markRunning = mutation({
  args: { jobId: v.id("contextCommunityJobs"), workflowId: v.string() },
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
    jobId: v.id("contextCommunityJobs"),
    phase: v.union(
      v.literal("loading"),
      v.literal("building"),
      v.literal("detecting"),
      v.literal("writing"),
    ),
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
    jobId: v.id("contextCommunityJobs"),
    communities: v.array(
      v.object({
        id: v.number(),
        memberCount: v.number(),
        sampleEntryIds: v.array(v.string()),
      }),
    ),
    entryCount: v.number(),
    edgeCount: v.number(),
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
        communities: args.communities,
        entryCount: args.entryCount,
        edgeCount: args.edgeCount,
      },
    });
  },
});

export const markFailed = mutation({
  args: { jobId: v.id("contextCommunityJobs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      updateTime: now,
      data: { status: "failed", error: args.error, failureTime: now },
    });
  },
});

export const markCommunitiesStale = mutation({
  args: { namespace: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("contextCommunityJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .collect();
    for (const job of jobs) {
      if (job.data.status === "completed" && !job.stale) {
        await ctx.db.patch(job._id, { stale: true, updateTime: Date.now() });
      }
    }
  },
});

const latestCommunitiesValidator = v.union(
  v.null(),
  v.object({
    jobId: v.id("contextCommunityJobs"),
    status: v.literal("completed"),
    communities: v.array(
      v.object({
        id: v.number(),
        memberCount: v.number(),
        sampleEntryIds: v.array(v.string()),
      }),
    ),
    entryCount: v.number(),
    edgeCount: v.number(),
    completionTime: v.number(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextCommunityJobs"),
    status: v.literal("running"),
    phase: v.union(
      v.literal("loading"),
      v.literal("building"),
      v.literal("detecting"),
      v.literal("writing"),
    ),
    loadedCount: v.number(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextCommunityJobs"),
    status: v.literal("failed"),
    error: v.string(),
    stale: v.boolean(),
  }),
  v.object({
    jobId: v.id("contextCommunityJobs"),
    status: v.literal("pending"),
    stale: v.boolean(),
  }),
);

export const getLatestCommunities = query({
  args: { namespace: v.string() },
  returns: latestCommunitiesValidator,
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("contextCommunityJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .first();
    if (!job) return null;
    if (hasStatus(job, "completed")) {
      return {
        jobId: job._id,
        status: "completed" as const,
        communities: job.data.communities,
        entryCount: job.data.entryCount,
        edgeCount: job.data.edgeCount,
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

export const getCommunityForEntry = query({
  args: { namespace: v.string(), entryId: v.string() },
  returns: v.union(v.null(), v.object({ communityId: v.number() })),
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("contextCommunityAssignments")
      .withIndex("by_namespace_entryId", (q) =>
        q.eq("namespace", args.namespace).eq("entryId", args.entryId),
      )
      .order("desc")
      .first();
    if (!assignment) return null;
    return { communityId: assignment.communityId };
  },
});

export const writeAssignments = mutation({
  args: {
    jobId: v.id("contextCommunityJobs"),
    namespace: v.string(),
    assignments: v.array(
      v.object({ entryId: v.string(), communityId: v.number() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const a of args.assignments) {
      await ctx.db.insert("contextCommunityAssignments", {
        jobId: args.jobId,
        namespace: args.namespace,
        entryId: a.entryId,
        communityId: a.communityId,
      });
    }
  },
});

export const clearAssignments = mutation({
  args: { jobId: v.id("contextCommunityJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("contextCommunityAssignments")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
  },
});

// Graph bridge functions for the workflow to call from the host app

export const deleteSimilarityEdgesForEntries = mutation({
  args: { entryIds: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const entryId of args.entryIds) {
      const { page } = await graph.edges.neighbors(ctx, {
        label: "SIMILAR_TO",
        node: entryId,
        paginationOpts: { cursor: null, numItems: 1000 },
      });
      for (const edge of page) {
        await graph.edges.delete(ctx, {
          label: "SIMILAR_TO",
          from: edge.from,
          to: edge.to,
        });
        deleted++;
      }
    }
    return deleted;
  },
});

export const createSimilarityEdgeBatch = mutation({
  args: {
    edges: v.array(
      v.object({ from: v.string(), to: v.string(), score: v.number() }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let created = 0;
    for (const e of args.edges) {
      await graph.edges.create(ctx, {
        label: "SIMILAR_TO",
        from: e.from,
        to: e.to,
        properties: { score: e.score },
      });
      created++;
    }
    return created;
  },
});

export const getCommunityMembers = query({
  args: { namespace: v.string(), communityId: v.number() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("contextCommunityAssignments")
      .withIndex("by_namespace_communityId", (q) =>
        q.eq("namespace", args.namespace).eq("communityId", args.communityId),
      )
      .collect();
    return docs.map((d) => d.entryId);
  },
});

export const getNeighborEdges = query({
  args: { entryId: v.string() },
  returns: v.array(
    v.object({ neighbor: v.string(), score: v.number() }),
  ),
  handler: async (ctx, args) => {
    const { page } = await graph.edges.neighbors(ctx, {
      label: "SIMILAR_TO",
      node: args.entryId,
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    return page.map((edge) => ({
      neighbor: edge.from === args.entryId ? edge.to : edge.from,
      score:
        (edge.properties as { score?: number } | undefined)?.score ?? 0,
    }));
  },
});

export const getNeighborEdgesBatch = query({
  args: { entryIds: v.array(v.string()) },
  returns: v.array(
    v.object({
      entryId: v.string(),
      neighbors: v.array(v.object({ neighbor: v.string(), score: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    const results = [];
    for (const entryId of args.entryIds) {
      const { page } = await graph.edges.neighbors(ctx, {
        label: "SIMILAR_TO",
        node: entryId,
        paginationOpts: { cursor: null, numItems: 100 },
      });
      results.push({
        entryId,
        neighbors: page.map((edge) => ({
          neighbor: edge.from === entryId ? edge.to : edge.from,
          score:
            (edge.properties as { score?: number } | undefined)?.score ?? 0,
        })),
      });
    }
    return results;
  },
});
