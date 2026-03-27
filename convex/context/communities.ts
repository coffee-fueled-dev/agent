import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  query,
} from "../_generated/server";
import { pool } from "../workpool";
import {
  applyAssignmentResultsHandler,
  cleanupStagingHandler,
  clearOldSimilarityEdgesHandler,
  scheduleCleanupHandler,
  writeNewSimilarityEdgesHandler,
} from "./communitiesLib/applyPipeline";
import { communityApi } from "./communitiesLib/deps";
import { getEntryGraphContextHandler } from "./communitiesLib/entryGraphContext";
import { finalizeCommunitiesHandler } from "./communitiesLib/finalize";
import { runComputeAndStageGraph } from "./communitiesLib/graphStage";
import { runComputeAndStageLeiden } from "./communitiesLib/leidenStage";
import {
  handleGraphComplete,
  handleLeidenComplete,
} from "./communitiesLib/onCompleteHandlers";
import { startContextCommunityWorkflowHandler } from "./communitiesLib/startWorkflow";

export const computeAndStageGraph = internalAction({
  args: { jobId: v.string(), k: v.number() },
  handler: async (ctx, args) => runComputeAndStageGraph(ctx, args),
});

export const computeAndStageLeiden = internalAction({
  args: { jobId: v.string(), resolution: v.number() },
  handler: async (ctx, args) => runComputeAndStageLeiden(ctx, args),
});

export const clearOldSimilarityEdges = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => clearOldSimilarityEdgesHandler(ctx, args),
});

export const writeNewSimilarityEdges = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => writeNewSimilarityEdgesHandler(ctx, args),
});

export const applyAssignmentResults = internalMutation({
  args: {
    jobId: v.string(),
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    clearedPrevious: v.boolean(),
  },
  handler: async (ctx, args) => applyAssignmentResultsHandler(ctx, args),
});

export const finalizeCommunities = internalAction({
  args: { jobId: v.string(), namespace: v.string() },
  handler: async (ctx, args) => finalizeCommunitiesHandler(ctx, args),
});

export const scheduleCleanup = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => scheduleCleanupHandler(ctx, args),
});

export const cleanupStaging = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => cleanupStagingHandler(ctx, args),
});

export const onGraphComplete = pool.defineOnComplete({
  context: v.object({ jobId: v.string(), resolution: v.number() }),
  handler: async (ctx, payload) => handleGraphComplete(ctx, payload),
});

export const onLeidenComplete = pool.defineOnComplete({
  context: v.object({ jobId: v.string() }),
  handler: async (ctx, payload) => handleLeidenComplete(ctx, payload),
});

export const startContextCommunityWorkflow = action({
  args: {
    namespace: v.string(),
    k: v.optional(v.number()),
    resolution: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    startContextCommunityWorkflowHandler(ctx, {
      namespace: args.namespace,
      k: args.k ?? 12,
      resolution: args.resolution ?? 1.0,
    }),
});

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
  handler: async (ctx, args) => getEntryGraphContextHandler(ctx, args),
});
