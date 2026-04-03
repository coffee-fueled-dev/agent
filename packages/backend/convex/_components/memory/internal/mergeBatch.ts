import { v } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import { internalMutation, type MutationCtx } from "../_generated/server.js";
import {
  lexicalSearch,
  MEMORY_SOURCE_SYSTEM,
  vectorSearch,
} from "../search.js";
import { appendCanonicalMemoryText } from "./canonicalText.js";
import {
  lexicalSlicePropKey,
  memorySearchSourceRef,
  type ContentSource,
  upsertSourceMapLink,
  VECTOR_EMBEDDING_PROP,
} from "./store.js";

type MergeChunk =
  | { text: string }
  | { embedding: number[] }
  | { text: string; embedding: number[] };

export { appendCanonicalMemoryText } from "./canonicalText.js";

const contentSourceValidator = v.object({
  type: v.string(),
  id: v.string(),
});

/** Shared by {@link applyMergeMemoryBatch} and inline append in `mergeMemory`. */
export async function executeMergeMemoryBatch(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    content: MergeChunk[];
    contentSource: ContentSource;
    /** When true, lexical/vector slices are updated but `memoryRecords.text` is not. */
    skipCanonicalText?: boolean;
    fileName?: string;
    mimeType?: string;
    /** From host `mergeMemory`; required when text-only chunks schedule async embed. */
    googleApiKey?: string;
  },
): Promise<void> {
  const skipCanonicalText = args.skipCanonicalText ?? false;
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
  let rollingText = doc.text;

  const meta =
    args.contentSource.type === "storage"
      ? { fileName: args.fileName, mimeType: args.mimeType }
      : {};

  for (let i = 0; i < len; i++) {
    const chunk = args.content[i];
    const sliceSeq = start + i;

    if ("text" in chunk && "embedding" in chunk) {
      if (!skipCanonicalText) {
        rollingText = appendCanonicalMemoryText(rollingText, chunk.text);
      }
      const lexItemId = await lexicalSearch.appendTextSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: lexicalSlicePropKey(sliceSeq),
        text: chunk.text,
      });
      const vecItemId = await vectorSearch.appendEmbeddingSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: VECTOR_EMBEDDING_PROP,
        sliceId: String(sliceSeq),
        embedding: chunk.embedding,
      });
      await upsertSourceMapLink(ctx, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        contentSource: args.contentSource,
        searchBackend: "lexical",
        searchItemId: String(lexItemId),
        ...meta,
      });
      await upsertSourceMapLink(ctx, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        contentSource: args.contentSource,
        searchBackend: "vector",
        searchItemId: String(vecItemId),
        ...meta,
      });
    } else if ("text" in chunk) {
      if (!args.googleApiKey) {
        throw new Error(
          "executeMergeMemoryBatch: googleApiKey is required for text chunks that embed (pass from host mergeMemory).",
        );
      }
      await ctx.scheduler.runAfter(
        0,
        internal.internal.embedText.embedTextChunk,
        {
          namespace: args.namespace,
          memoryRecordId: args.memoryRecordId,
          sliceSeq,
          text: chunk.text,
          skipCanonicalText,
          contentSource: args.contentSource,
          fileName: args.fileName,
          mimeType: args.mimeType,
          googleApiKey: args.googleApiKey,
        },
      );
    } else {
      const vecItemId = await vectorSearch.appendEmbeddingSlice(ctx, {
        namespace: args.namespace,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        sourceRef,
        propKey: VECTOR_EMBEDDING_PROP,
        sliceId: String(sliceSeq),
        embedding: chunk.embedding,
      });
      await upsertSourceMapLink(ctx, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        contentSource: args.contentSource,
        searchBackend: "vector",
        searchItemId: String(vecItemId),
        ...meta,
      });
    }
  }

  await ctx.db.patch(args.memoryRecordId, {
    nextChunkSeq: start + len,
    ...(!skipCanonicalText && rollingText !== doc.text
      ? { text: rollingText }
      : {}),
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
    skipCanonicalText: v.optional(v.boolean()),
    contentSource: contentSourceValidator,
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    googleApiKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await executeMergeMemoryBatch(ctx, args);
    return null;
  },
});
