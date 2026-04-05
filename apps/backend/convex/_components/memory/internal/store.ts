import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { lexicalSearch, MEMORY_SOURCE_SYSTEM, vectorSearch } from "../search";
import { appendCanonicalMemoryText } from "./canonicalText.js";

/** One lexical + one vector search item per memory row (search `sourceRef` string). */
export function memorySearchSourceRef(
  memoryRecordId: Id<"memoryRecords">,
): string {
  return String(memoryRecordId);
}

export function lexicalSlicePropKey(sliceSeq: number): string {
  return `t${sliceSeq}`;
}

export const VECTOR_EMBEDDING_PROP = "embedding" as const;

export type ContentSource = { type: string; id: string };

/** Upsert link from (memory, provenance, backend) to opaque search component `searchItems` id. */
export async function upsertSourceMapLink(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    contentSource: ContentSource;
    searchBackend: "lexical" | "vector";
    searchItemId: string;
    fileName?: string;
    mimeType?: string;
  },
): Promise<void> {
  const existing = await ctx.db
    .query("memorySourceMap")
    .withIndex("by_namespace_memory_content_backend", (q) =>
      q
        .eq("namespace", args.namespace)
        .eq("memoryRecord", args.memoryRecordId)
        .eq("contentSource.type", args.contentSource.type)
        .eq("contentSource.id", args.contentSource.id)
        .eq("searchBackend", args.searchBackend),
    )
    .first();

  const storageMeta =
    args.contentSource.type === "storage"
      ? {
          fileName: args.fileName,
          mimeType: args.mimeType,
        }
      : {};

  if (existing) {
    await ctx.db.patch(existing._id, {
      searchItemId: args.searchItemId,
      ...storageMeta,
    });
    return;
  }

  await ctx.db.insert("memorySourceMap", {
    namespace: args.namespace,
    memoryRecord: args.memoryRecordId,
    contentSource: args.contentSource,
    searchBackend: args.searchBackend,
    searchItemId: args.searchItemId,
    ...storageMeta,
  });
}

/** Called from {@link embedTextChunk} after embedding text-only chunks. */
export const applyEmbeddedChunk = internalMutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    sliceSeq: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    skipCanonicalText: v.optional(v.boolean()),
    contentSource: v.object({
      type: v.string(),
      id: v.string(),
    }),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const skipCanonicalText = args.skipCanonicalText ?? false;
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc) {
      throw new Error("applyEmbeddedChunk: memory record not found");
    }
    const mergedText = appendCanonicalMemoryText(doc.text, args.text);
    const sourceRef = memorySearchSourceRef(args.memoryRecordId);
    const propKey = lexicalSlicePropKey(args.sliceSeq);
    const lexItemId = await lexicalSearch.appendTextSlice(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
      propKey,
      text: args.text,
    });
    const vecItemId = await vectorSearch.appendEmbeddingSlice(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
      propKey: VECTOR_EMBEDDING_PROP,
      sliceId: String(args.sliceSeq),
      embedding: args.embedding,
    });
    await upsertSourceMapLink(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId,
      contentSource: args.contentSource,
      searchBackend: "lexical",
      searchItemId: String(lexItemId),
      fileName: args.fileName,
      mimeType: args.mimeType,
    });
    await upsertSourceMapLink(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId,
      contentSource: args.contentSource,
      searchBackend: "vector",
      searchItemId: String(vecItemId),
      fileName: args.fileName,
      mimeType: args.mimeType,
    });
    await ctx.db.patch(args.memoryRecordId, {
      ...(!skipCanonicalText && mergedText !== doc.text
        ? { text: mergedText }
        : {}),
    });
    return null;
  },
});
