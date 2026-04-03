import { v } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import { internalMutation, type MutationCtx } from "../_generated/server.js";
import {
  lexicalSearch,
  MEMORY_SOURCE_SYSTEM,
  vectorSearch,
} from "../search.js";
import {
  ensureSourceMap,
  lexicalSlicePropKey,
  memorySearchSourceRef,
  VECTOR_EMBEDDING_PROP,
} from "./store.js";

type MergeChunk =
  | { text: string }
  | { embedding: number[] }
  | { text: string; embedding: number[] };

/** Shared by {@link applyMergeMemoryBatch} and inline append in `mergeMemory`. */
export async function executeMergeMemoryBatch(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    content: MergeChunk[];
  },
): Promise<void> {
  const doc = await ctx.db.get(args.memoryRecordId);
  if (!doc) {
    throw new Error("applyMergeMemoryBatch: memory record not found");
  }
  if (doc.namespace !== args.namespace) {
    throw new Error("applyMergeMemoryBatch: memory record namespace mismatch");
  }

  const start = doc.nextChunkSeq ?? 0;
  const len = args.content.length;
  const sourceRef = memorySearchSourceRef(args.memoryRecordId);

  for (let i = 0; i < len; i++) {
    const chunk = args.content[i];
    const sliceSeq = start + i;

    if ("text" in chunk && "embedding" in chunk) {
      await lexicalSearch.appendTextSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: lexicalSlicePropKey(sliceSeq),
        text: chunk.text,
      });
      await vectorSearch.appendEmbeddingSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: VECTOR_EMBEDDING_PROP,
        sliceId: String(sliceSeq),
        embedding: chunk.embedding,
      });
    } else if ("text" in chunk) {
      await ctx.scheduler.runAfter(
        0,
        internal.internal.embedText.embedTextChunk,
        {
          namespace: args.namespace,
          memoryRecordId: args.memoryRecordId,
          sliceSeq,
          text: chunk.text,
        },
      );
    } else {
      await vectorSearch.appendEmbeddingSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: VECTOR_EMBEDDING_PROP,
        sliceId: String(sliceSeq),
        embedding: chunk.embedding,
      });
    }
  }

  await ensureSourceMap(ctx, {
    namespace: args.namespace,
    sourceRef,
    memoryRecordId: args.memoryRecordId,
  });

  await ctx.db.patch(args.memoryRecordId, {
    nextChunkSeq: start + len,
  });
}

export const applyMergeMemoryBatch = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    content: v.array(
      v.union(
        v.object({ text: v.string() }),
        v.object({ embedding: v.array(v.float64()) }),
        v.object({
          text: v.string(),
          embedding: v.array(v.float64()),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await executeMergeMemoryBatch(ctx, args);
    return null;
  },
});
