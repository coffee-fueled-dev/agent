import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { action, mutation, query } from "../_generated/server";
import { internal as componentInternal } from "../_generated/api";
import schema from "../schema";
import { graph } from "../graph";
import { createContextRag } from "../internal/rag";
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

const CLEAR_BATCH = 100;

export const clearAssignments = mutation({
  args: { jobId: v.id("contextCommunityJobs") },
  returns: v.object({ hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("contextCommunityAssignments")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(CLEAR_BATCH);
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { hasMore: docs.length === CLEAR_BATCH };
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

export const deleteSimilarityEdgesForNode = mutation({
  args: { nodeKey: v.string() },
  returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    return await graph.edges.deleteForNode(ctx, {
      label: "SIMILAR_TO",
      nodeKey: args.nodeKey,
      limit: 50,
    });
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

// Staging CRUD

export const writeStagingEdges = mutation({
  args: {
    jobId: v.id("contextCommunityJobs"),
    edges: v.array(v.object({ from: v.string(), to: v.string(), weight: v.number() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const e of args.edges) {
      await ctx.db.insert("contextStagingEdges", {
        jobId: args.jobId,
        from: e.from,
        to: e.to,
        weight: e.weight,
      });
    }
  },
});

export const readStagingEdgePage = query({
  args: {
    jobId: v.id("contextCommunityJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextStagingEdges")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .paginate(args.paginationOpts);
  },
});

export const writeStagingAssignments = mutation({
  args: {
    jobId: v.id("contextCommunityJobs"),
    assignments: v.array(v.object({ nodeId: v.string(), communityId: v.number() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const a of args.assignments) {
      await ctx.db.insert("contextStagingAssignments", {
        jobId: args.jobId,
        nodeId: a.nodeId,
        communityId: a.communityId,
      });
    }
  },
});

export const readStagingAssignmentPage = query({
  args: {
    jobId: v.id("contextCommunityJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextStagingAssignments")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .paginate(args.paginationOpts);
  },
});

export const clearStaging = mutation({
  args: { jobId: v.id("contextCommunityJobs") },
  returns: v.object({ hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    let deleted = 0;
    const edges = await ctx.db
      .query("contextStagingEdges")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(CLEAR_BATCH);
    for (const doc of edges) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    const assignments = await ctx.db
      .query("contextStagingAssignments")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(CLEAR_BATCH - deleted);
    for (const doc of assignments) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    return { hasMore: deleted === CLEAR_BATCH };
  },
});

export const batchKnnSearch = action({
  args: {
    namespace: v.string(),
    entryIds: v.array(v.string()),
    k: v.number(),
  },
  returns: v.array(
    v.object({
      entryId: v.string(),
      neighbors: v.array(v.object({ entryId: v.string(), score: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    const rag = createContextRag();
    const results: Array<{
      entryId: string;
      neighbors: Array<{ entryId: string; score: number }>;
    }> = [];

    for (const entryId of args.entryIds) {
      const embedding: number[] | null = await ctx.runQuery(
        componentInternal.internal.embeddingStore.get,
        { entryId },
      );
      if (!embedding) {
        results.push({ entryId, neighbors: [] });
        continue;
      }

      const { entries, results: searchResults } = await rag.search(ctx, {
        namespace: args.namespace,
        query: embedding,
        limit: args.k + 1,
        filters: [{ name: "status", value: "current" }],
      });

      const scoreMap = new Map<string, number>();
      for (const r of searchResults) {
        scoreMap.set(
          r.entryId,
          Math.max(scoreMap.get(r.entryId) ?? 0, r.score),
        );
      }

      const neighbors = entries
        .filter((e) => e.entryId !== entryId)
        .map((e) => ({
          entryId: e.entryId,
          score: scoreMap.get(e.entryId) ?? 0,
        }))
        .slice(0, args.k);

      results.push({ entryId, neighbors });
    }

    return results;
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
