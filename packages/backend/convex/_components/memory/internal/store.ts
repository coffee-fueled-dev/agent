import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { lexicalSearch, MEMORY_SOURCE_SYSTEM, vectorSearch } from "../search";

const SOURCE_MAP_TYPE = "memoryChunk";

/** One lexical + one vector search item per memory row. */
export function memorySearchSourceRef(
  memoryRecordId: Id<"memoryRecords">,
): string {
  return String(memoryRecordId);
}

export function lexicalSlicePropKey(sliceSeq: number): string {
  return `t${sliceSeq}`;
}

export const VECTOR_EMBEDDING_PROP = "embedding" as const;

export async function ensureSourceMap(
  ctx: MutationCtx,
  args: {
    namespace: string;
    sourceRef: string;
    memoryRecordId: Id<"memoryRecords">;
  },
) {
  const existing = await ctx.db
    .query("memorySourceMap")
    .withIndex("by_namespace_sourceRef", (q) =>
      q
        .eq("namespace", args.namespace)
        .eq("sourceRef.type", SOURCE_MAP_TYPE)
        .eq("sourceRef.id", args.sourceRef),
    )
    .first();
  if (existing) {
    if (existing.memoryRecord !== args.memoryRecordId) {
      await ctx.db.patch(existing._id, {
        memoryRecord: args.memoryRecordId,
      });
    }
    return;
  }
  await ctx.db.insert("memorySourceMap", {
    namespace: args.namespace,
    sourceRef: { type: SOURCE_MAP_TYPE, id: args.sourceRef },
    memoryRecord: args.memoryRecordId,
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sourceRef = memorySearchSourceRef(args.memoryRecordId);
    const propKey = lexicalSlicePropKey(args.sliceSeq);
    await lexicalSearch.appendTextSlice(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
      propKey,
      text: args.text,
    });
    await vectorSearch.appendEmbeddingSlice(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
      propKey: VECTOR_EMBEDDING_PROP,
      sliceId: String(args.sliceSeq),
      embedding: args.embedding,
    });
    await ensureSourceMap(ctx, {
      namespace: args.namespace,
      sourceRef,
      memoryRecordId: args.memoryRecordId,
    });
    return null;
  },
});
