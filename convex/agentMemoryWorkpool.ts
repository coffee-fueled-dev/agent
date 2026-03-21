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
