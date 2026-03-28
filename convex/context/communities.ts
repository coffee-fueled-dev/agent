import { v } from "convex/values";
import { z } from "zod/v4";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { sessionAction, sessionQuery } from "../customFunctions";
import { assertAccountNamespace } from "../models/auth/contextNamespace";
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

export const startContextCommunityWorkflow = sessionAction({
  args: {
    namespace: z.string(),
    k: z.number().optional(),
    resolution: z.number().optional(),
  },
  handler: async (ctx, args) => {
    const accountId = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: args.sessionId },
    );
    assertAccountNamespace(accountId, args.namespace);
    return startContextCommunityWorkflowHandler(ctx, {
      namespace: args.namespace,
      k: args.k ?? 12,
      resolution: args.resolution ?? 1.0,
    });
  },
});

export const getLatestCommunities = sessionQuery({
  args: { namespace: z.string() },
  handler: async (ctx, args) => {
    assertAccountNamespace(ctx.account?._id, args.namespace);
    return await ctx.runQuery(communityApi.getLatestCommunities, args);
  },
});

export const getCommunityForEntry = sessionQuery({
  args: { namespace: z.string(), entryId: z.string() },
  handler: async (ctx, args) => {
    assertAccountNamespace(ctx.account?._id, args.namespace);
    return await ctx.runQuery(communityApi.getCommunityForEntry, args);
  },
});

export const getEntryGraphContext = sessionQuery({
  args: { namespace: z.string(), entryId: z.string() },
  handler: async (ctx, args) => {
    assertAccountNamespace(ctx.account?._id, args.namespace);
    return getEntryGraphContextHandler(ctx, args);
  },
});
