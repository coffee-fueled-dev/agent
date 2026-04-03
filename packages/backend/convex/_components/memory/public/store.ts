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

const contentSourceValidator = v.object({
  type: v.string(),
  id: v.string(),
});

export const mergeMemory = mutation({
  args: {
    namespace: v.string(),
    mode: v.optional(v.union(v.null(), v.literal("append"))),
    key: v.optional(v.string()),
    memoryRecordId: v.optional(v.id("memoryRecords")),
    content: contentValidator,
    /** When true, index chunks but do not append to `memoryRecords.text` (e.g. file-backed ingest). */
    skipCanonicalText: v.optional(v.boolean()),
    /**
     * Provenance for source map rows. Defaults to `memoryInline` for this record id.
     * Use `storage` + storage id for file-backed memories.
     */
    contentSource: v.optional(contentSourceValidator),
    /** Denormalized on source map rows when `contentSource.type === "storage"`. */
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    /** From host app; required when merges include text-only chunks that need embedding. */
    googleApiKey: v.optional(v.string()),
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
      const contentSource =
        args.contentSource ?? ({ type: "memoryInline", id: String(id) } as const);
      await executeMergeMemoryBatch(ctx, {
        namespace: args.namespace,
        memoryRecordId: id,
        content: args.content,
        skipCanonicalText: args.skipCanonicalText,
        contentSource,
        fileName: args.fileName,
        mimeType: args.mimeType,
        googleApiKey: args.googleApiKey,
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

    const contentSource =
      args.contentSource ??
      ({ type: "memoryInline", id: String(memoryRecordId) } as const);

    const workId = await mergeMemoryPool.enqueueMutation(
      ctx,
      internal.internal.mergeBatch.applyMergeMemoryBatch,
      {
        namespace: args.namespace,
        memoryRecordId,
        content: args.content,
        skipCanonicalText: args.skipCanonicalText,
        contentSource,
        fileName: args.fileName,
        mimeType: args.mimeType,
        googleApiKey: args.googleApiKey,
      },
    );

    return { memoryRecordId, workId };
  },
});
