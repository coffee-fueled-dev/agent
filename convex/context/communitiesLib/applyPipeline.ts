import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { GRAPH_EDGE_BATCH, STAGING_ASSIGNMENT_BATCH } from "./constants";
import { communityApi, staging } from "./deps";
import type { StagingAssignmentPage, StagingEdgePage } from "./types";

export async function clearOldSimilarityEdgesHandler(
  ctx: MutationCtx,
  args: {
    jobId: string;
    namespace: string;
    cursor: string | null;
  },
) {
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
}

export async function writeNewSimilarityEdgesHandler(
  ctx: MutationCtx,
  args: {
    jobId: string;
    namespace: string;
    cursor: string | null;
  },
) {
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
}

export async function applyAssignmentResultsHandler(
  ctx: MutationCtx,
  args: {
    jobId: string;
    namespace: string;
    cursor: string | null;
    clearedPrevious: boolean;
  },
) {
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
    await ctx.scheduler.runAfter(
      0,
      internal.context.communities.finalizeCommunities,
      {
        jobId: args.jobId,
        namespace: args.namespace,
      },
    );
  }
}

export async function scheduleCleanupHandler(
  ctx: MutationCtx,
  args: { jobId: string },
) {
  await ctx.scheduler.runAfter(0, internal.context.communities.cleanupStaging, {
    jobId: args.jobId,
  });
}

export async function cleanupStagingHandler(
  ctx: MutationCtx,
  args: { jobId: string },
) {
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
}
