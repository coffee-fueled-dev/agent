import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const fileChunkValidator = v.object({
  text: v.optional(v.string()),
  embedding: v.array(v.number()),
});

export default defineSchema({
  fileProcesses: defineTable({
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("dispatched"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    memoryId: v.optional(v.string()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_namespace", ["namespace"])
    .index("by_memoryId_updatedAt", ["memoryId", "updatedAt"]),

  fileResultCache: defineTable({
    contentHash: v.string(),
    mimeType: v.string(),
    retrievalText: v.string(),
    lexicalText: v.optional(v.string()),
    chunks: v.array(fileChunkValidator),
    updatedAt: v.number(),
  }).index("by_contentHash", ["contentHash"]),
});
