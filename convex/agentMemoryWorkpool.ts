import { Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { AgentMemoryClient } from "./components/agentMemory/client";

export const agentMemoryEpisodicPool = new Workpool(
  components.agentMemoryWorkpool,
  {
    maxParallelism: 4,
    retryActionsByDefault: false,
  },
);

export const episodicCommitCompleted = agentMemoryEpisodicPool.defineOnComplete(
  {
    context: v.object({
      runtime: v.string(),
      streamId: v.string(),
      commitKey: v.string(),
    }),
    handler: async (ctx, { workId, result }) => {
      if (result.kind === "success") {
        return;
      }
      await new AgentMemoryClient(components.agentMemory, {
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      }).finalizeRuntimeCommit(ctx, {
        workId,
        state: result.kind === "canceled" ? "canceled" : "failed",
        error: result.kind === "failed" ? result.error : undefined,
      });
    },
  },
);

export const chartMaintenanceCompleted =
  agentMemoryEpisodicPool.defineOnComplete({
    context: v.object({
      namespace: v.string(),
      requestId: v.string(),
    }),
    handler: async (ctx, { result, context }) => {
      if (result.kind === "success") {
        return;
      }
      await ctx.runMutation(
        components.agentMemory.public.runtimeApi.completeMemoryChartMaintenance,
        {
          namespace: context.namespace,
          entryTime: Date.now(),
        },
      );
    },
  });
