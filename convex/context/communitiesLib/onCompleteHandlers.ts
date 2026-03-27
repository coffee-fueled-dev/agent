import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { pool } from "../../workpool";
import { communityApi } from "./deps";

export async function handleGraphComplete(
  ctx: ActionCtx,
  {
    context,
    result,
  }: {
    context: { jobId: string; resolution: number };
    result:
      | { kind: "success"; returnValue?: unknown }
      | { kind: "failed"; error: string }
      | { kind: "canceled" };
  },
) {
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

  await pool.enqueueAction(
    ctx,
    internal.context.communities.computeAndStageLeiden,
    { jobId: context.jobId, resolution: context.resolution },
    {
      onComplete: internal.context.communities.onLeidenComplete,
      context: { jobId: context.jobId },
    },
  );
}

export async function handleLeidenComplete(
  ctx: ActionCtx,
  {
    context,
    result,
  }: {
    context: { jobId: string };
    result:
      | { kind: "success"; returnValue?: unknown }
      | { kind: "failed"; error: string }
      | { kind: "canceled" };
  },
) {
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

  await ctx.scheduler.runAfter(
    0,
    internal.context.communities.clearOldSimilarityEdges,
    {
      jobId: context.jobId,
      namespace: job.namespace,
      cursor: null,
    },
  );
}
