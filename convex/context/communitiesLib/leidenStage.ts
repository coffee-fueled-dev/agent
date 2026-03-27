import type { ActionCtx } from "../../_generated/server";
import { leiden } from "../../components/graph/client";
import { STAGING_ASSIGNMENT_BATCH, STAGING_EDGE_BATCH } from "./constants";
import { communityApi, staging } from "./deps";
import { loadCurrentEntryIdsPaginated } from "./loadEntries";
import type { StagingEdgePage } from "./types";

export async function runComputeAndStageLeiden(
  ctx: ActionCtx,
  args: { jobId: string; resolution: number },
) {
  const job = await ctx.runQuery(communityApi.getJob, { jobId: args.jobId });
  if (!job) throw new Error(`Job ${args.jobId} not found`);

  await ctx.runMutation(communityApi.updatePhase, {
    jobId: args.jobId,
    phase: "detecting",
  });

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

  const currentEntryIds = await loadCurrentEntryIdsPaginated(
    ctx,
    job.namespace,
  );

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
}
