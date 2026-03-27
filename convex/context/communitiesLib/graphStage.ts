import type { ActionCtx } from "../../_generated/server";
import {
  KNN_BATCH_SIZE,
  NEIGHBOR_BATCH_SIZE,
  STAGING_EDGE_BATCH,
} from "./constants";
import { communityApi, staging } from "./deps";
import { loadCurrentEntryIdsPaginated } from "./loadEntries";

export async function runComputeAndStageGraph(
  ctx: ActionCtx,
  args: { jobId: string; k: number },
) {
  const job = await ctx.runQuery(communityApi.getJob, { jobId: args.jobId });
  if (!job) throw new Error(`Job ${args.jobId} not found`);

  await ctx.runMutation(communityApi.updatePhase, {
    jobId: args.jobId,
    phase: "loading",
    loadedCount: 0,
  });

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
}
