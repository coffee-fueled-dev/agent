import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { STAGING_ASSIGNMENT_BATCH } from "./constants";
import { communityApi, staging } from "./deps";
import type { StagingAssignmentPage, StagingEdgePage } from "./types";

export async function finalizeCommunitiesHandler(
  ctx: ActionCtx,
  args: { jobId: string; namespace: string },
) {
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

  await ctx.runMutation(internal.context.communities.scheduleCleanup, {
    jobId: args.jobId,
  });
}
