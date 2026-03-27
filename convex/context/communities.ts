import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  query,
} from "../_generated/server";
import { leiden } from "../components/graph/client";
import { pool } from "../workpool";

const EMBEDDING_PAGE_SIZE = 100;
const KNN_BATCH_SIZE = 30;
const STAGING_EDGE_BATCH = 50;
const STAGING_ASSIGNMENT_BATCH = 200;
const GRAPH_EDGE_BATCH = 20;
const NEIGHBOR_BATCH_SIZE = 10;

const communityApi = components.context.public.community;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- staging functions are generated after codegen
const staging = communityApi as Record<string, any>;
const projectionApi = components.context.public.projection;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- paginated loader available after codegen
const projApi = projectionApi as Record<string, any>;

type PaginatedVersions = PaginationResult<{
  entryId: string;
  data: { status: string };
}>;

async function loadCurrentEntryIdsPaginated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { runQuery: (...args: any[]) => Promise<any> },
  namespace: string,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const result: PaginatedVersions = await ctx.runQuery(
      projApi.loadCurrentEntryIdPage,
      { namespace, paginationOpts: { cursor, numItems: EMBEDDING_PAGE_SIZE } },
    );
    for (const row of result.page) {
      if (row.data.status === "current") ids.push(row.entryId);
    }
    cursor = result.continueCursor;
    isDone = result.isDone;
  }
  return ids;
}

type StagingEdgePage = PaginationResult<{
  from: string;
  to: string;
  weight: number;
}>;

type StagingAssignmentPage = PaginationResult<{
  nodeId: string;
  communityId: number;
}>;

// ---------------------------------------------------------------------------
// Fat action 1: compute k-NN graph and write to staging tables
// ---------------------------------------------------------------------------

export const computeAndStageGraph = internalAction({
  args: { jobId: v.string(), k: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(communityApi.getJob, { jobId: args.jobId });
    if (!job) throw new Error(`Job ${args.jobId} not found`);

    await ctx.runMutation(communityApi.updatePhase, {
      jobId: args.jobId,
      phase: "loading",
      loadedCount: 0,
    });

    // Load current entry IDs (paginated, no embeddings needed in memory)
    const currentEntryIds = await loadCurrentEntryIdsPaginated(
      ctx,
      job.namespace,
    );

    await ctx.runMutation(communityApi.updatePhase, {
      jobId: args.jobId,
      phase: "loading",
      loadedCount: currentEntryIds.length,
    });

    if (currentEntryIds.length < 2) {
      await ctx.runMutation(communityApi.markCompleted, {
        jobId: args.jobId,
        communities: [],
        entryCount: currentEntryIds.length,
        edgeCount: 0,
      });
      return { entryCount: currentEntryIds.length, edgeCount: 0, done: true };
    }

    await ctx.runMutation(communityApi.updatePhase, {
      jobId: args.jobId,
      phase: "building",
      loadedCount: currentEntryIds.length,
    });

    // Use ANN vector search to find k-NN for each entry (no brute-force)
    const currentSet = new Set(currentEntryIds);
    const edgeMap = new Map<string, number>();

    for (let i = 0; i < currentEntryIds.length; i += KNN_BATCH_SIZE) {
      const batch = currentEntryIds.slice(i, i + KNN_BATCH_SIZE);
      const batchResults: Array<{
        entryId: string;
        neighbors: Array<{ entryId: string; score: number }>;
      }> = await ctx.runAction(staging.batchKnnSearch, {
        namespace: job.namespace,
        entryIds: batch,
        k: args.k,
      });
      for (const { entryId, neighbors } of batchResults) {
        for (const { entryId: neighborId, score } of neighbors) {
          if (!currentSet.has(neighborId)) continue;
          const key =
            entryId < neighborId
              ? `${entryId}:${neighborId}`
              : `${neighborId}:${entryId}`;
          edgeMap.set(key, Math.max(edgeMap.get(key) ?? 0, score));
        }
      }
    }

    // Augment with existing graph edges
    for (let i = 0; i < currentEntryIds.length; i += NEIGHBOR_BATCH_SIZE) {
      const batch = currentEntryIds.slice(i, i + NEIGHBOR_BATCH_SIZE);
      const batchResults: Array<{
        entryId: string;
        neighbors: Array<{ neighbor: string; score: number }>;
      }> = await ctx.runQuery(communityApi.getNeighborEdgesBatch, {
        entryIds: batch,
      });
      for (const { entryId, neighbors } of batchResults) {
        for (const { neighbor, score } of neighbors) {
          if (!currentSet.has(neighbor)) continue;
          const key =
            entryId < neighbor
              ? `${entryId}:${neighbor}`
              : `${neighbor}:${entryId}`;
          edgeMap.set(key, Math.max(edgeMap.get(key) ?? 0, score));
        }
      }
    }

    // Write edges to staging in batches
    const allEdges = Array.from(edgeMap.entries()).map(([key, weight]) => {
      const sep = key.indexOf(":");
      return { from: key.slice(0, sep), to: key.slice(sep + 1), weight };
    });

    for (let i = 0; i < allEdges.length; i += STAGING_EDGE_BATCH) {
      await ctx.runMutation(staging.writeStagingEdges, {
        jobId: args.jobId,
        edges: allEdges.slice(i, i + STAGING_EDGE_BATCH),
      });
    }

    return {
      entryCount: currentEntryIds.length,
      edgeCount: allEdges.length,
      done: false,
    };
  },
});

// ---------------------------------------------------------------------------
// Fat action 2: read staged edges, run Leiden, write assignments to staging
// ---------------------------------------------------------------------------

export const computeAndStageLeiden = internalAction({
  args: { jobId: v.string(), resolution: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(communityApi.getJob, { jobId: args.jobId });
    if (!job) throw new Error(`Job ${args.jobId} not found`);

    await ctx.runMutation(communityApi.updatePhase, {
      jobId: args.jobId,
      phase: "detecting",
    });

    // Read all staged edges
    const edges: Array<{ from: string; to: string; weight: number }> = [];
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const result: StagingEdgePage = await ctx.runQuery(
        staging.readStagingEdgePage,
        {
          jobId: args.jobId,
          paginationOpts: { cursor, numItems: STAGING_EDGE_BATCH },
        },
      );
      for (const row of result.page) {
        edges.push({ from: row.from, to: row.to, weight: row.weight });
      }
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    // Load current entry IDs as node set
    const currentEntryIds = await loadCurrentEntryIdsPaginated(
      ctx,
      job.namespace,
    );

    // Build adjacency and run Leiden
    const adj = new Map<string, Map<string, number>>();
    for (const n of currentEntryIds) adj.set(n, new Map());
    for (const e of edges) {
      if (!adj.has(e.from)) adj.set(e.from, new Map());
      if (!adj.has(e.to)) adj.set(e.to, new Map());
      const fromMap = adj.get(e.from);
      const toMap = adj.get(e.to);
      if (fromMap) fromMap.set(e.to, e.weight);
      if (toMap) toMap.set(e.from, e.weight);
    }
    const assignments = leiden(adj, args.resolution);

    // Write assignments to staging
    const assignmentArray = Array.from(assignments.entries()).map(
      ([nodeId, communityId]) => ({ nodeId, communityId }),
    );
    for (let i = 0; i < assignmentArray.length; i += STAGING_ASSIGNMENT_BATCH) {
      await ctx.runMutation(staging.writeStagingAssignments, {
        jobId: args.jobId,
        assignments: assignmentArray.slice(i, i + STAGING_ASSIGNMENT_BATCH),
      });
    }

    return { communityCount: new Set(assignments.values()).size };
  },
});

// ---------------------------------------------------------------------------
// Apply mutations (paginated, re-enqueue via scheduler)
// ---------------------------------------------------------------------------

// Phase A: delete old SIMILAR_TO edges for nodes found in staging edges
export const clearOldSimilarityEdges = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const result: StagingEdgePage = await ctx.runQuery(
      staging.readStagingEdgePage,
      {
        jobId: args.jobId,
        paginationOpts: { cursor: args.cursor, numItems: GRAPH_EDGE_BATCH },
      },
    );

    const nodesToClear = new Set<string>();
    for (const row of result.page) {
      nodesToClear.add(row.from);
      nodesToClear.add(row.to);
    }

    for (const nodeKey of nodesToClear) {
      let hasMore = true;
      while (hasMore) {
        const deleteResult = (await ctx.runMutation(
          staging.deleteSimilarityEdgesForNode,
          { nodeKey },
        )) as { deleted: number; hasMore: boolean };
        hasMore = deleteResult.hasMore;
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.clearOldSimilarityEdges,
        {
          jobId: args.jobId,
          namespace: args.namespace,
          cursor: result.continueCursor,
        },
      );
    } else {
      // Phase A complete — start Phase B: write new edges
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.writeNewSimilarityEdges,
        {
          jobId: args.jobId,
          namespace: args.namespace,
          cursor: null,
        },
      );
    }
  },
});

// Phase B: write new SIMILAR_TO edges from staging
export const writeNewSimilarityEdges = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const result: StagingEdgePage = await ctx.runQuery(
      staging.readStagingEdgePage,
      {
        jobId: args.jobId,
        paginationOpts: { cursor: args.cursor, numItems: GRAPH_EDGE_BATCH },
      },
    );

    if (result.page.length > 0) {
      await ctx.runMutation(communityApi.createSimilarityEdgeBatch, {
        edges: result.page.map((row) => ({
          from: row.from,
          to: row.to,
          score: row.weight,
        })),
      });
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.writeNewSimilarityEdges,
        {
          jobId: args.jobId,
          namespace: args.namespace,
          cursor: result.continueCursor,
        },
      );
    } else {
      // Phase B complete — move to applying assignments
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.applyAssignmentResults,
        {
          jobId: args.jobId,
          namespace: args.namespace,
          cursor: null,
          clearedPrevious: false,
        },
      );
    }
  },
});

export const applyAssignmentResults = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    clearedPrevious: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Clear previous assignments first (paginated)
    if (!args.clearedPrevious) {
      const latestCommunities = await ctx.runQuery(
        communityApi.getLatestCommunities,
        {
          namespace: args.namespace,
        },
      );
      if (
        latestCommunities &&
        "jobId" in latestCommunities &&
        latestCommunities.jobId !== args.jobId
      ) {
        const clearResult = (await ctx.runMutation(
          communityApi.clearAssignments,
          {
            jobId: latestCommunities.jobId,
          },
        )) as unknown as { hasMore: boolean };
        if (clearResult.hasMore) {
          // Re-enqueue to continue clearing
          await ctx.scheduler.runAfter(
            0,
            internal.context.communities.applyAssignmentResults,
            {
              jobId: args.jobId,
              namespace: args.namespace,
              cursor: null,
              clearedPrevious: false,
            },
          );
          return;
        }
      }
    }

    const result: StagingAssignmentPage = await ctx.runQuery(
      staging.readStagingAssignmentPage,
      {
        jobId: args.jobId,
        paginationOpts: {
          cursor: args.cursor,
          numItems: STAGING_ASSIGNMENT_BATCH,
        },
      },
    );

    if (result.page.length > 0) {
      await ctx.runMutation(communityApi.writeAssignments, {
        jobId: args.jobId,
        namespace: args.namespace,
        assignments: result.page.map((row) => ({
          entryId: row.nodeId,
          communityId: row.communityId,
        })),
      });
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.applyAssignmentResults,
        {
          jobId: args.jobId,
          namespace: args.namespace,
          cursor: result.continueCursor,
          clearedPrevious: true,
        },
      );
    } else {
      // Build community summaries from staging data, then cleanup
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.finalizeCommunities,
        {
          jobId: args.jobId,
          namespace: args.namespace,
        },
      );
    }
  },
});

export const finalizeCommunities = internalAction({
  args: { jobId: v.string(), namespace: v.string() },
  handler: async (ctx, args) => {
    // Read all staging assignments to build summaries
    const communityMap = new Map<number, string[]>();
    let cursor: string | null = null;
    let isDone = false;
    let entryCount = 0;
    while (!isDone) {
      const result: StagingAssignmentPage = await ctx.runQuery(
        staging.readStagingAssignmentPage,
        {
          jobId: args.jobId,
          paginationOpts: { cursor, numItems: STAGING_ASSIGNMENT_BATCH },
        },
      );
      for (const row of result.page) {
        let members = communityMap.get(row.communityId);
        if (!members) {
          members = [];
          communityMap.set(row.communityId, members);
        }
        members.push(row.nodeId);
        entryCount++;
      }
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    let edgeCount = 0;
    cursor = null;
    isDone = false;
    while (!isDone) {
      const result: StagingEdgePage = await ctx.runQuery(
        staging.readStagingEdgePage,
        { jobId: args.jobId, paginationOpts: { cursor, numItems: 500 } },
      );
      edgeCount += result.page.length;
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    const communities = Array.from(communityMap.entries()).map(
      ([id, members]) => ({
        id,
        memberCount: members.length,
        sampleEntryIds: members.slice(0, 5),
      }),
    );

    await ctx.runMutation(communityApi.markCompleted, {
      jobId: args.jobId,
      communities,
      entryCount,
      edgeCount,
    });

    // Schedule cleanup (actions can't use ctx.scheduler directly)
    await ctx.runMutation(internal.context.communities.scheduleCleanup, {
      jobId: args.jobId,
    });
  },
});

export const scheduleCleanup = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.context.communities.cleanupStaging,
      {
        jobId: args.jobId,
      },
    );
  },
});

export const cleanupStaging = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const result = (await ctx.runMutation(staging.clearStaging, {
      jobId: args.jobId,
    })) as { hasMore: boolean };
    if (result.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.context.communities.cleanupStaging,
        {
          jobId: args.jobId,
        },
      );
    }
  },
});

// ---------------------------------------------------------------------------
// onComplete chain handlers
// ---------------------------------------------------------------------------

export const onGraphComplete = pool.defineOnComplete({
  context: v.object({ jobId: v.string(), resolution: v.number() }),
  handler: async (ctx, { context, result }) => {
    if (result.kind !== "success") {
      const error = result.kind === "failed" ? result.error : "Canceled";
      await ctx.runMutation(communityApi.markFailed, {
        jobId: context.jobId,
        error,
      });
      return;
    }

    const returnValue = result.returnValue as { done?: boolean } | undefined;
    if (returnValue?.done) return;

    // Chain: enqueue Leiden computation
    await pool.enqueueAction(
      ctx,
      internal.context.communities.computeAndStageLeiden,
      { jobId: context.jobId, resolution: context.resolution },
      {
        onComplete: internal.context.communities.onLeidenComplete,
        context: { jobId: context.jobId },
      },
    );
  },
});

export const onLeidenComplete = pool.defineOnComplete({
  context: v.object({ jobId: v.string() }),
  handler: async (ctx, { context, result }) => {
    if (result.kind !== "success") {
      const error = result.kind === "failed" ? result.error : "Canceled";
      await ctx.runMutation(communityApi.markFailed, {
        jobId: context.jobId,
        error,
      });
      return;
    }

    const job = await ctx.runQuery(communityApi.getJob, {
      jobId: context.jobId,
    });
    if (!job) return;

    await ctx.runMutation(communityApi.updatePhase, {
      jobId: context.jobId,
      phase: "writing",
    });

    // Chain: start Phase A — clear old edges, then write new
    await ctx.scheduler.runAfter(
      0,
      internal.context.communities.clearOldSimilarityEdges,
      {
        jobId: context.jobId,
        namespace: job.namespace,
        cursor: null,
      },
    );
  },
});

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export const startContextCommunityWorkflow = action({
  args: {
    namespace: v.string(),
    k: v.optional(v.number()),
    resolution: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const k = args.k ?? 12;
    const resolution = args.resolution ?? 1.0;

    const jobId = await ctx.runMutation(communityApi.createJob, {
      namespace: args.namespace,
      params: { k, resolution },
    });

    try {
      const workId = await pool.enqueueAction(
        ctx,
        internal.context.communities.computeAndStageGraph,
        { jobId, k },
        {
          onComplete: internal.context.communities.onGraphComplete,
          context: { jobId, resolution },
        },
      );
      await ctx.runMutation(communityApi.markRunning, {
        jobId,
        workflowId: String(workId),
      });
      return { jobId, status: "running" as const };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start community pipeline";
      await ctx.runMutation(communityApi.markFailed, { jobId, error: message });
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------
// Query wrappers
// ---------------------------------------------------------------------------

export const getLatestCommunities = query({
  args: { namespace: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(communityApi.getLatestCommunities, args);
  },
});

export const getCommunityForEntry = query({
  args: { namespace: v.string(), entryId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(communityApi.getCommunityForEntry, args);
  },
});

const contextApi = components.context.public.entries;

export const getEntryGraphContext = query({
  args: { namespace: v.string(), entryId: v.string() },
  handler: async (ctx, args) => {
    const neighbors: Array<{ neighbor: string; score: number }> =
      await ctx.runQuery(communityApi.getNeighborEdges, {
        entryId: args.entryId,
      });

    const assignment = await ctx.runQuery(communityApi.getCommunityForEntry, {
      namespace: args.namespace,
      entryId: args.entryId,
    });

    let communityMembers: string[] = [];
    if (assignment) {
      communityMembers = await ctx.runQuery(communityApi.getCommunityMembers, {
        namespace: args.namespace,
        communityId: assignment.communityId,
      });
    }

    const neighborIds = neighbors.map((n) => n.neighbor);
    const [metas, accessStats] = await Promise.all([
      neighborIds.length
        ? (ctx.runQuery(communityApi.getEntryMetas, {
            namespace: args.namespace,
            entryIds: neighborIds,
          }) as Promise<
            Array<{ entryId: string; title?: string; textPreview: string }>
          >)
        : Promise.resolve([]),
      neighborIds.length
        ? (ctx.runQuery(contextApi.getAccessStatsBatch, {
            entryIds: neighborIds,
          }) as Promise<
            Record<
              string,
              {
                decayedScore: number;
                totalAccesses: number;
                lastAccessTime: number;
              }
            >
          >)
        : Promise.resolve({} as Record<string, never>),
    ]);
    const metaMap = new Map(metas.map((m) => [m.entryId, m]));

    const fileMap = new Map<string, string>();
    for (const id of neighborIds) {
      const file = await ctx.db
        .query("contextFiles")
        .withIndex("by_entryId", (q) => q.eq("entryId", id))
        .first();
      if (file) fileMap.set(id, file.mimeType);
    }

    return {
      neighbors: neighbors.map((n) => ({
        id: n.neighbor,
        score: n.score,
        title: metaMap.get(n.neighbor)?.title,
        textPreview: metaMap.get(n.neighbor)?.textPreview,
        mimeType: fileMap.get(n.neighbor),
        decayedScore: accessStats[n.neighbor]?.decayedScore,
      })),
      communityMembers,
    };
  },
});
