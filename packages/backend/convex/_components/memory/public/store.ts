import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { executeMergeMemoryBatch } from "../internal/mergeBatch.js";
import { mergeMemoryPool } from "../internal/mergeWorkpool";

const contentValidator = v.array(
  v.union(
    v.object({ text: v.string() }),
    v.object({ embedding: v.array(v.float64()) }),
    v.object({
      text: v.string(),
      embedding: v.array(v.float64()),
    }),
  ),
);

export const mergeMemory = mutation({
  args: {
    namespace: v.string(),
    mode: v.optional(v.union(v.null(), v.literal("append"))),
    key: v.optional(v.string()),
    memoryRecordId: v.optional(v.id("memoryRecords")),
    content: contentValidator,
  },
  returns: v.object({
    memoryRecordId: v.id("memoryRecords"),
    workId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ memoryRecordId: Id<"memoryRecords">; workId: string }> => {
    const mode = args.mode ?? null;

    let memoryRecordId: Id<"memoryRecords">;

    if (mode === "append") {
      const id = args.memoryRecordId;
      if (!id) {
        throw new Error("mergeMemory: memoryRecordId is required when mode is append");
      }
      memoryRecordId = id;
      /** Inline batch so sequential appends do not race workpool vs `mergeMemory`'s read of `memoryRecords` (OCC). */
      await executeMergeMemoryBatch(ctx, {
        namespace: args.namespace,
        memoryRecordId: id,
        content: args.content,
      });
      return { memoryRecordId: id, workId: "inline" };
    }

    const key = args.key;
    if (key === undefined || key.length === 0) {
      throw new Error("mergeMemory: key is required when not appending");
    }
    const existing = await ctx.db
      .query("memoryRecords")
      .withIndex("by_namespace_key", (q) =>
        q.eq("namespace", args.namespace).eq("key", key),
      )
      .unique();

    memoryRecordId =
      existing?._id ??
      (await ctx.db.insert("memoryRecords", {
        namespace: args.namespace,
        key,
        nextChunkSeq: 0,
      }));

    const workId = await mergeMemoryPool.enqueueMutation(
      ctx,
      internal.internal.mergeBatch.applyMergeMemoryBatch,
      {
        namespace: args.namespace,
        memoryRecordId,
        content: args.content,
      },
    );

    return { memoryRecordId, workId };
  },
});
