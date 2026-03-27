import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { pool } from "../../workpool";
import { communityApi } from "./deps";

export async function startContextCommunityWorkflowHandler(
  ctx: ActionCtx,
  args: { namespace: string; k: number; resolution: number },
) {
  const jobId = await ctx.runMutation(communityApi.createJob, {
    namespace: args.namespace,
    params: { k: args.k, resolution: args.resolution },
  });

  try {
    const workId = await pool.enqueueAction(
      ctx,
      internal.context.communities.computeAndStageGraph,
      { jobId, k: args.k },
      {
        onComplete: internal.context.communities.onGraphComplete,
        context: { jobId, resolution: args.resolution },
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
}
