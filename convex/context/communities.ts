import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { buildKnnGraph, leiden } from "../components/graph/client";
import { components, internal } from "../_generated/api";
import { action, internalAction, query } from "../_generated/server";
import { workflow as workflowManager } from "../workflow";

const EMBEDDING_PAGE_SIZE = 100;
const EDGE_BATCH_SIZE = 50;
const ASSIGNMENT_BATCH_SIZE = 200;
const DELETE_BATCH_SIZE = 20;

const communityApi = components.context.public.community;
const projectionApi = components.context.public.projection;

type PaginatedEmbeddings = PaginationResult<{
  entryId: string;
  embedding: number[];
}>;

// Pure computation actions

export const computeKnnGraph = internalAction({
  args: {
    entries: v.array(v.object({ id: v.string(), embedding: v.array(v.number()) })),
    k: v.number(),
  },
  handler: async (_ctx, args) => {
    const adj = buildKnnGraph(args.entries, args.k);
    // Serialize Map<string, Map<string, number>> to array of edges
    const edges: Array<{ from: string; to: string; weight: number }> = [];
    const seen = new Set<string>();
    for (const [from, neighbors] of adj) {
      for (const [to, weight] of neighbors) {
        const key = from < to ? `${from}:${to}` : `${to}:${from}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ from, to, weight });
        }
      }
    }
    return edges;
  },
});

export const computeLeiden = internalAction({
  args: {
    edges: v.array(v.object({ from: v.string(), to: v.string(), weight: v.number() })),
    nodes: v.array(v.string()),
    resolution: v.number(),
  },
  handler: async (_ctx, args) => {
    const adj = new Map<string, Map<string, number>>();
    for (const n of args.nodes) adj.set(n, new Map());
    for (const e of args.edges) {
      if (!adj.has(e.from)) adj.set(e.from, new Map());
      if (!adj.has(e.to)) adj.set(e.to, new Map());
      const fromMap = adj.get(e.from) ?? new Map();
      fromMap.set(e.to, e.weight);
      const toMap = adj.get(e.to) ?? new Map();
      toMap.set(e.from, e.weight);
    }
    const result = leiden(adj, args.resolution);
    return Array.from(result.entries()).map(([nodeId, communityId]) => ({
      nodeId,
      communityId,
    }));
  },
});

// Workflow

export const runContextCommunityWorkflow = workflowManager.define({
  args: { jobId: v.string(), k: v.number(), resolution: v.number() },
  returns: v.object({ entryCount: v.number(), edgeCount: v.number() }),
  handler: async (step, args) => {
    const job = await step.runQuery(
      communityApi.getJob,
      { jobId: args.jobId },
      { inline: true },
    );
    if (!job) throw new Error(`Community job ${args.jobId} not found`);

    try {
      // 1. Load embeddings (each page is a separate workflow step)
      const embeddings: Array<{ entryId: string; embedding: number[] }> = [];
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const result: PaginatedEmbeddings = await step.runQuery(
          projectionApi.loadEmbeddingPage,
          {
            namespace: job.namespace,
            paginationOpts: { cursor, numItems: EMBEDDING_PAGE_SIZE },
          },
        );
        embeddings.push(...result.page);
        cursor = result.continueCursor;
        isDone = result.isDone;
      }

      const currentEntryIds: string[] = await step.runQuery(
        projectionApi.loadCurrentEntryIds,
        { namespace: job.namespace },
      );
      const currentSet = new Set(currentEntryIds);
      const currentEmbeddings = embeddings.filter((e) =>
        currentSet.has(e.entryId),
      );

      await step.runMutation(
        communityApi.updatePhase,
        { jobId: args.jobId, phase: "loading", loadedCount: currentEmbeddings.length },
        { inline: true },
      );

      if (currentEmbeddings.length < 2) {
        await step.runMutation(
          communityApi.markCompleted,
          {
            jobId: args.jobId,
            communities: [],
            entryCount: currentEmbeddings.length,
            edgeCount: 0,
          },
          { inline: true },
        );
        return { entryCount: currentEmbeddings.length, edgeCount: 0 };
      }

      // 2. Build k-NN graph
      await step.runMutation(
        communityApi.updatePhase,
        { jobId: args.jobId, phase: "building", loadedCount: currentEmbeddings.length },
        { inline: true },
      );

      const entries = currentEmbeddings.map((e) => ({
        id: e.entryId,
        embedding: e.embedding,
      }));

      const knnEdges: Array<{ from: string; to: string; weight: number }> =
        await step.runAction(internal.context.communities.computeKnnGraph, {
          entries,
          k: args.k,
        });

      // 3. Augment with existing graph edges (each entry is a separate step)
      const edgeMap = new Map<string, number>();
      for (const e of knnEdges) {
        const key = e.from < e.to ? `${e.from}:${e.to}` : `${e.to}:${e.from}`;
        edgeMap.set(key, Math.max(edgeMap.get(key) ?? 0, e.weight));
      }

      for (const entryId of currentEntryIds) {
        const neighbors: Array<{ neighbor: string; score: number }> =
          await step.runQuery(
            communityApi.getNeighborEdges,
            { entryId },
          );
        for (const { neighbor, score } of neighbors) {
          if (!currentSet.has(neighbor)) continue;
          const key =
            entryId < neighbor
              ? `${entryId}:${neighbor}`
              : `${neighbor}:${entryId}`;
          edgeMap.set(key, Math.max(edgeMap.get(key) ?? 0, score));
        }
      }

      const augmentedEdges = Array.from(edgeMap.entries()).map(
        ([key, weight]) => {
          const parts = key.split(":");
          return { from: parts[0] ?? "", to: parts[1] ?? "", weight };
        },
      );

      // 4. Run Leiden
      await step.runMutation(
        communityApi.updatePhase,
        { jobId: args.jobId, phase: "detecting", loadedCount: currentEmbeddings.length },
        { inline: true },
      );

      const assignments: Array<{ nodeId: string; communityId: number }> =
        await step.runAction(internal.context.communities.computeLeiden, {
          edges: augmentedEdges,
          nodes: currentEntryIds,
          resolution: args.resolution,
        });

      // 5. Writing phase
      await step.runMutation(
        communityApi.updatePhase,
        { jobId: args.jobId, phase: "writing", loadedCount: currentEmbeddings.length },
        { inline: true },
      );

      // 6. Scoped-delete old SIMILAR_TO edges (each batch is a separate step)
      for (let i = 0; i < currentEntryIds.length; i += DELETE_BATCH_SIZE) {
        const batch = currentEntryIds.slice(i, i + DELETE_BATCH_SIZE);
        await step.runMutation(
          communityApi.deleteSimilarityEdgesForEntries,
          { entryIds: batch },
        );
      }

      // 7. Write new SIMILAR_TO edges from k-NN adjacency
      let totalEdges = 0;
      for (let i = 0; i < augmentedEdges.length; i += EDGE_BATCH_SIZE) {
        const batch = augmentedEdges
          .slice(i, i + EDGE_BATCH_SIZE)
          .map((e) => ({ from: e.from, to: e.to, score: e.weight }));
        const created: number = await step.runMutation(
          communityApi.createSimilarityEdgeBatch,
          { edges: batch },
        );
        totalEdges += created;
      }

      // 8. Write community assignments
      const previousJobs = await step.runQuery(
        communityApi.getLatestCommunities,
        { namespace: job.namespace },
        { inline: true },
      );
      if (
        previousJobs &&
        "jobId" in previousJobs &&
        previousJobs.jobId !== args.jobId
      ) {
        await step.runMutation(
          communityApi.clearAssignments,
          { jobId: previousJobs.jobId },
        );
      }

      for (let i = 0; i < assignments.length; i += ASSIGNMENT_BATCH_SIZE) {
        const batch = assignments
          .slice(i, i + ASSIGNMENT_BATCH_SIZE)
          .map((a) => ({ entryId: a.nodeId, communityId: a.communityId }));
        await step.runMutation(
          communityApi.writeAssignments,
          { jobId: args.jobId, namespace: job.namespace, assignments: batch },
        );
      }

      // 9. Build community summaries
      const communityMap = new Map<number, string[]>();
      for (const a of assignments) {
        let members = communityMap.get(a.communityId);
        if (!members) {
          members = [];
          communityMap.set(a.communityId, members);
        }
        members.push(a.nodeId);
      }
      const communities = Array.from(communityMap.entries()).map(
        ([id, members]) => ({
          id,
          memberCount: members.length,
          sampleEntryIds: members.slice(0, 5),
        }),
      );

      await step.runMutation(
        communityApi.markCompleted,
        {
          jobId: args.jobId,
          communities,
          entryCount: currentEmbeddings.length,
          edgeCount: totalEdges,
        },
        { inline: true },
      );

      return { entryCount: currentEmbeddings.length, edgeCount: totalEdges };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Community detection failed";
      await step.runMutation(
        communityApi.markFailed,
        { jobId: args.jobId, error: message },
        { inline: true },
      );
      throw error;
    }
  },
});

// Public entry points

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
      const workflowId = String(
        await workflowManager.start(
          ctx,
          internal.context.communities.runContextCommunityWorkflow,
          { jobId, k, resolution },
          { startAsync: true },
        ),
      );
      await ctx.runMutation(communityApi.markRunning, { jobId, workflowId });
      return { jobId, status: "running" as const };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start community workflow";
      await ctx.runMutation(communityApi.markFailed, {
        jobId,
        error: message,
      });
      throw error;
    }
  },
});

// Query wrappers

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
      communityMembers = await ctx.runQuery(
        communityApi.getCommunityMembers,
        {
          namespace: args.namespace,
          communityId: assignment.communityId,
        },
      );
    }

    return {
      neighbors: neighbors.map((n) => ({ id: n.neighbor, score: n.score })),
      communityMembers,
    };
  },
});
