import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { busTables } from "./observability/events.js";

export default defineSchema({
  ...busTables,
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
    .index("by_namespace_storage", ["namespace", "storageId"])
    .index("by_namespace_memory_record", ["namespace", "memoryRecordId"]),

  /** Marker that this content hash was embedded at least once (optional bookkeeping). */
  fileEmbeddingCache: defineTable({
    contentHash: v.string(),
    jobId: v.optional(v.string()),
  }).index("by_content_hash", ["contentHash"]),

  /**
   * Per (namespace, thread) chat tip + session for building human ToolPolicyArgs / ConvexAgentEnv.
   */
  chatContext: defineTable({
    namespace: v.string(),
    threadId: v.string(),
    /** Latest message in the thread when known; unset until first message or backfill. */
    lastMessageId: v.optional(v.string()),
    sessionId: v.string(),
    updatedAt: v.number(),
  }).index("by_namespace_thread", ["namespace", "threadId"]),
});
