import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { memoryClient } from "../_clients/memory.js";
import type { Id } from "../_components/memory/_generated/dataModel.js";
import { internal } from "../_generated/api.js";
import { mutation } from "../_generated/server.js";
import { memoryWorkflowManager } from "./workflows.js";

export const deleteMemoriesBatch = mutation({
  args: {
    userId: v.string(),
    memoryRecordIds: v.array(v.string()),
    ...SessionIdArg,
  },
  returns: v.object({
    scheduled: v.number(),
    workflowIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const unique = [...new Set(args.memoryRecordIds)].slice(0, 100);
    const workflowIds: string[] = [];
    for (const memoryRecordId of unique) {
      const rec = await memoryClient.getMemoryRecord(ctx, {
        namespace: args.userId,
        memoryRecordId: memoryRecordId as Id<"memoryRecords">,
      });
      if (!rec) continue;
      const wid = await memoryWorkflowManager.start(
        ctx,
        internal.memories.workflows.deleteMemoryCascade,
        {
          namespace: args.userId,
          memoryRecordId,
        },
      );
      workflowIds.push(String(wid));
    }
    return { scheduled: workflowIds.length, workflowIds };
  },
});
