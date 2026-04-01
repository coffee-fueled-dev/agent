import { buildKnnGraph } from "@very-coffee/k-nearest-neighbors";
import { leiden } from "@very-coffee/leiden";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { graph } from "../graph";

export const getNeighborEdges = query({
  args: { memoryId: v.string() },
  returns: v.array(v.object({ neighbor: v.string(), score: v.number() })),
  handler: async (ctx, args) => {
    const { page } = await graph.edges.neighbors(ctx, {
      label: "SIMILAR_TO",
      node: args.memoryId,
      paginationOpts: { cursor: null, numItems: 500 },
    });
    return page.map((edge) => ({
      neighbor: edge.from === args.memoryId ? edge.to : edge.from,
      score: (edge.properties as { score?: number } | undefined)?.score ?? 0,
    }));
  },
});

export const expandNeighbors = query({
  args: {
    memoryId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const take = args.limit ?? 20;
    const { page } = await graph.edges.neighbors(ctx, {
      label: "SIMILAR_TO",
      node: args.memoryId,
      paginationOpts: { cursor: null, numItems: take },
    });
    const out: string[] = [];
    for (const edge of page) {
      const n = edge.from === args.memoryId ? edge.to : edge.from;
      out.push(n);
    }
    return out;
  },
});

export const createCommunityJob = mutation({
  args: {
    namespace: v.string(),
    params: v.object({ k: v.number(), resolution: v.number() }),
  },
  returns: v.id("memoryCommunityJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("memoryCommunityJobs", {
      namespace: args.namespace,
      stale: false,
      updateTime: Date.now(),
      params: args.params,
      data: { status: "pending" },
    });
  },
});

export const getLatestCommunities = query({
  args: { namespace: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("memoryCommunityJobs"),
      status: v.literal("completed"),
      communities: v.array(
        v.object({
          id: v.number(),
          memberCount: v.number(),
          sampleMemoryIds: v.array(v.string()),
        }),
      ),
      memoryCount: v.number(),
      edgeCount: v.number(),
      completionTime: v.number(),
      stale: v.boolean(),
    }),
    v.any(),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("memoryCommunityJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .first();
    if (!job) return null;
    if (job.data.status === "completed") {
      return {
        jobId: job._id,
        status: "completed" as const,
        communities: job.data.communities,
        memoryCount: job.data.memoryCount,
        edgeCount: job.data.edgeCount,
        completionTime: job.data.completionTime,
        stale: job.stale,
      };
    }
    return job;
  },
});

export const getCommunityForMemory = query({
  args: { namespace: v.string(), memoryId: v.string() },
  returns: v.union(v.null(), v.object({ communityId: v.number() })),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memoryCommunityAssignments")
      .withIndex("by_namespace_memoryId", (q) =>
        q.eq("namespace", args.namespace).eq("memoryId", args.memoryId),
      )
      .order("desc")
      .first();
    if (!row) return null;
    return { communityId: row.communityId };
  },
});

export const deleteSimilarityEdgesForMemories = internalMutation({
  args: { memoryIds: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const memoryId of args.memoryIds) {
      const { page } = await graph.edges.neighbors(ctx, {
        label: "SIMILAR_TO",
        node: memoryId,
        paginationOpts: { cursor: null, numItems: 500 },
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

export const writeCommunityAssignments = internalMutation({
  args: {
    jobId: v.id("memoryCommunityJobs"),
    namespace: v.string(),
    assignments: v.array(
      v.object({ memoryId: v.string(), communityId: v.number() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const a of args.assignments) {
      await ctx.db.insert("memoryCommunityAssignments", {
        jobId: args.jobId,
        namespace: args.namespace,
        memoryId: a.memoryId,
        communityId: a.communityId,
      });
    }
  },
});

export const createSimilarityEdgeBatch = internalMutation({
  args: {
    edges: v.array(
      v.object({ from: v.string(), to: v.string(), score: v.number() }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let n = 0;
    for (const e of args.edges) {
      await graph.edges.create(ctx, {
        label: "SIMILAR_TO",
        from: e.from,
        to: e.to,
        properties: { score: e.score },
      });
      n++;
    }
    return n;
  },
});

export const patchCommunityJob = internalMutation({
  args: {
    jobId: v.id("memoryCommunityJobs"),
    data: v.any(),
    stale: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      updateTime: Date.now(),
      data: args.data,
      ...(args.stale !== undefined ? { stale: args.stale } : {}),
    });
  },
});

export const getJob = internalQuery({
  args: { jobId: v.id("memoryCommunityJobs") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const clearAssignmentsForNamespace = internalMutation({
  args: { namespace: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (;;) {
      const batch = await ctx.db
        .query("memoryCommunityAssignments")
        .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
        .take(200);
      if (!batch.length) break;
      for (const row of batch) await ctx.db.delete(row._id);
    }
  },
});

export const scheduleCommunityRebuild = mutation({
  args: {
    jobId: v.id("memoryCommunityJobs"),
    namespace: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.public.graph.runCommunityDetection,
      args,
    );
  },
});

export const runCommunityDetection = internalAction({
  args: {
    jobId: v.id("memoryCommunityJobs"),
    namespace: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.public.graph.getJob, {
      jobId: args.jobId,
    });
    if (!job || job.data.status !== "pending") return null;

    await ctx.runMutation(internal.public.graph.patchCommunityJob, {
      jobId: args.jobId,
      data: {
        status: "running",
        phase: "loading",
        loadedCount: 0,
      },
    });

    const rows = await ctx.runQuery(
      internal.internal.embeddingStore.listByNamespace,
      { namespace: args.namespace, limit: 50_000 },
    );

    if (rows.length < 2) {
      await ctx.runMutation(internal.public.graph.patchCommunityJob, {
        jobId: args.jobId,
        data: {
          status: "completed",
          completionTime: Date.now(),
          communities: [],
          memoryCount: rows.length,
          edgeCount: 0,
        },
        stale: false,
      });
      return null;
    }

    await ctx.runMutation(internal.public.graph.patchCommunityJob, {
      jobId: args.jobId,
      data: {
        status: "running",
        phase: "building",
        loadedCount: rows.length,
      },
    });

    await ctx.runMutation(internal.public.graph.clearAssignmentsForNamespace, {
      namespace: args.namespace,
    });

    const memoryIds = rows.map(
      (r: { memoryId: string; embedding: number[] }) => r.memoryId,
    );
    await ctx.runMutation(
      internal.public.graph.deleteSimilarityEdgesForMemories,
      {
        memoryIds,
      },
    );

    const k = job.params.k;
    const resolution = job.params.resolution;
    const entries = rows.map(
      (r: { memoryId: string; embedding: number[] }) => ({
        id: r.memoryId,
        embedding: r.embedding,
      }),
    );

    const adj = buildKnnGraph(entries, k, { mode: "exact" });
    let edgeCount = 0;
    const edgeBatch: {
      from: string;
      to: string;
      score: number;
    }[] = [];
    for (const [from, neigh] of adj) {
      for (const [to, w] of neigh) {
        if (from < to) {
          edgeBatch.push({ from, to, score: w });
          edgeCount++;
        }
      }
    }
    const CHUNK = 50;
    for (let i = 0; i < edgeBatch.length; i += CHUNK) {
      await ctx.runMutation(internal.public.graph.createSimilarityEdgeBatch, {
        edges: edgeBatch.slice(i, i + CHUNK),
      });
    }

    await ctx.runMutation(internal.public.graph.patchCommunityJob, {
      jobId: args.jobId,
      data: {
        status: "running",
        phase: "detecting",
        loadedCount: rows.length,
      },
    });

    const communities = leiden(adj, resolution);
    const byCommunity = new Map<number, string[]>();
    for (const [nodeId, cid] of communities) {
      const list = byCommunity.get(cid) ?? [];
      list.push(nodeId);
      byCommunity.set(cid, list);
    }

    const summary = [...byCommunity.entries()].map(([id, members]) => ({
      id,
      memberCount: members.length,
      sampleMemoryIds: members.slice(0, 5),
    }));

    const assignments: { memoryId: string; communityId: number }[] = [];
    for (const [nodeId, cid] of communities) {
      assignments.push({ memoryId: nodeId, communityId: cid });
    }
    for (let i = 0; i < assignments.length; i += 200) {
      await ctx.runMutation(internal.public.graph.writeCommunityAssignments, {
        jobId: args.jobId,
        namespace: args.namespace,
        assignments: assignments.slice(i, i + 200),
      });
    }

    await ctx.runMutation(internal.public.graph.patchCommunityJob, {
      jobId: args.jobId,
      data: {
        status: "completed",
        completionTime: Date.now(),
        communities: summary,
        memoryCount: rows.length,
        edgeCount,
      },
      stale: false,
    });
    return null;
  },
});
