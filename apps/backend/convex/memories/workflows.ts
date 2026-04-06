import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "_generated/api.js";
import { v } from "convex/values";

export const memoryWorkflowManager = new WorkflowManager(components.workflow);

export const deleteMemoryCascade = memoryWorkflowManager.define({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
  },
  returns: v.null(),
  handler: async (step, args): Promise<null> => {
    const { namespace, memoryRecordId } = args;

    await step.runMutation(
      internal.memories.deleteMemorySteps.deleteFileProcessesForMemory,
      { namespace, memoryRecordId },
    );

    await step.runMutation(
      internal.memories.deleteMemorySteps.deleteMemorySearchIndexesStep,
      { namespace, memoryRecordId },
    );

    const limit = 100;
    while (true) {
      const batch = await step.runMutation(
        internal.memories.deleteMemorySteps.deleteMemorySourceMapBatchStep,
        { namespace, memoryRecordId, limit },
      );
      if (!batch.hasMore) break;
    }

    await step.runMutation(
      internal.memories.deleteMemorySteps.tryDeleteMemoryGraphNodeStep,
      { namespace, memoryRecordId },
    );

    await step.runMutation(
      internal.memories.deleteMemorySteps.deleteMemoryRecordDocumentStep,
      { namespace, memoryRecordId },
    );

    return null;
  },
});
