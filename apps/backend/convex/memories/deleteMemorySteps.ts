/**
 * Internal steps for {@link ./workflows.deleteMemoryCascade} — each mutation is
 * small enough for one transaction; workflow loops source-map batches.
 */

import { memoryClient } from "_clients/memory.js";
import type { Id } from "_components/memory/_generated/dataModel.js";
import { internalMutation } from "_generated/server.js";
import { v } from "convex/values";

export const deleteFileProcessesForMemory = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    let deleted = 0;
    while (true) {
      const batch = await ctx.db
        .query("fileProcesses")
        .withIndex("by_namespace_memory_record", (q) =>
          q
            .eq("namespace", args.namespace)
            .eq("memoryRecordId", args.memoryRecordId),
        )
        .take(50);
      if (batch.length === 0) break;
      for (const row of batch) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const deleteMemorySearchIndexesStep = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memoryClient.deleteMemorySearchIndexes(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
    });
    return null;
  },
});

export const deleteMemorySourceMapBatchStep = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
    limit: v.number(),
  },
  returns: v.object({
    deleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    return await memoryClient.deleteMemorySourceMapBatch(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
      limit: args.limit,
    });
  },
});

export const tryDeleteMemoryGraphNodeStep = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memoryClient.tryDeleteMemoryGraphNode(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
    });
    return null;
  },
});

export const deleteMemoryRecordDocumentStep = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memoryClient.deleteMemoryRecordDocument(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
    });
    return null;
  },
});
