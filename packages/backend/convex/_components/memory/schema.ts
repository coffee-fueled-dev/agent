import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Opaque caller-owned reference (e.g. external entity id). */
export const sourceRefValidator = v.string();

export default defineSchema({
  /** Canonical memory row; `_id` is the stable id; `ragEntryId` links to the RAG component. */
  memoryRecords: defineTable({
    namespace: v.string(),
    key: v.string(),
    /** Next chunk sequence for this stream; OCC with applyMergeMemoryBatch. */
    nextChunkSeq: v.optional(v.number()),
  }).index("by_namespace_key", ["namespace", "key"]),

  /** Maps opaque source refs to a memory record id. */
  memorySourceMap: defineTable({
    namespace: v.string(),
    sourceRef: v.object({
      type: v.string(),
      id: v.string(),
    }),
    memoryRecord: v.id("memoryRecords"),
  })
    .index("by_namespace_sourceRef", [
      "namespace",
      "sourceRef.type",
      "sourceRef.id",
    ])
    .index("by_memoryRecord", ["memoryRecord"]),
});
