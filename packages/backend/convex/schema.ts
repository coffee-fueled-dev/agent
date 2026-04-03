import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  fileProcesses: defineTable({
    namespace: v.string(),
    key: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    title: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    /** Id in the memory component (`memoryRecords`). */
    memoryRecordId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    lastChunkOrder: v.optional(v.number()),
  })
    .index("by_namespace_key", ["namespace", "key"])
    .index("by_namespace_content_hash", ["namespace", "contentHash"])
    .index("by_namespace_storage", ["namespace", "storageId"]),

  /** Marker that this content hash was embedded at least once (optional bookkeeping). */
  fileEmbeddingCache: defineTable({
    contentHash: v.string(),
    jobId: v.optional(v.string()),
  }).index("by_content_hash", ["contentHash"]),
});
