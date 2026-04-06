import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Opaque caller-owned reference (e.g. external entity id). */
export const sourceRefValidator = v.string();

export const contentSourceValidator = v.object({
  type: v.string(),
  id: v.string(),
});

export const searchBackendValidator = v.union(
  v.literal("lexical"),
  v.literal("vector"),
  v.literal("graph"),
);

export default defineSchema({
  /** Canonical memory row; `_id` is the stable id; `ragEntryId` links to the RAG component. */
  memoryRecords: defineTable({
    namespace: v.string(),
    key: v.string(),
    /** Optional display title (e.g. plaintext memories from tools). */
    title: v.optional(v.string()),
    /** Next chunk sequence for this stream; OCC with applyMergeMemoryBatch. */
    nextChunkSeq: v.optional(v.number()),
    /** Rollup for merges without `skipCanonicalText`; file ingest skips this field. */
    text: v.optional(v.string()),
  }).index("by_namespace_key", ["namespace", "key"]),

  /**
   * Links canonical memory + content provenance to lexical/vector `searchItems` or the graph node key
   * (`searchBackend: "graph"`, `searchItemId` = node key).
   * `contentSource` identifies the original artifact (e.g. storage id, inline memory id).
   */
  memorySourceMap: defineTable({
    namespace: v.string(),
    memoryRecord: v.id("memoryRecords"),
    contentSource: contentSourceValidator,
    searchBackend: searchBackendValidator,
    searchItemId: v.string(),
    /** Set when `contentSource.type === "storage"` (denormalized for resolution without app file tables). */
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  })
    .index("by_namespace_memoryRecord", ["namespace", "memoryRecord"])
    .index("by_namespace_memory_content_backend", [
      "namespace",
      "memoryRecord",
      "contentSource.type",
      "contentSource.id",
      "searchBackend",
    ]),
});
