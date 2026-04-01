import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Opaque caller-owned reference (e.g. external entity id). */
export const sourceRefValidator = v.string();

export default defineSchema({
  /** Canonical stable memory row; `memoryId` matches RAG entry id string. */
  memoryRecords: defineTable({
    namespace: v.string(),
    memoryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    updatedAt: v.number(),
  })
    .index("by_memoryId", ["memoryId"])
    .index("by_namespace_and_key", ["namespace", "key"]),

  /** Maps opaque source refs to a stable memory id. */
  memorySourceMap: defineTable({
    namespace: v.string(),
    sourceRef: sourceRefValidator,
    memoryId: v.string(),
  })
    .index("by_namespace_and_sourceRef", ["namespace", "sourceRef"])
    .index("by_memoryId", ["memoryId"]),

  /** One embedding vector per memory for similarity / batch graph (mirrors context pattern). */
  memoryEmbeddings: defineTable({
    memoryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
  })
    .index("by_memoryId", ["memoryId"])
    .index("by_namespace", ["namespace"]),

  memoryCommunityJobs: defineTable({
    namespace: v.string(),
    stale: v.boolean(),
    updateTime: v.number(),
    params: v.object({
      k: v.number(),
      resolution: v.number(),
    }),
    data: v.union(
      v.object({ status: v.literal("pending") }),
      v.object({
        status: v.literal("running"),
        phase: v.union(
          v.literal("loading"),
          v.literal("building"),
          v.literal("detecting"),
          v.literal("writing"),
        ),
        loadedCount: v.number(),
      }),
      v.object({
        status: v.literal("completed"),
        completionTime: v.number(),
        communities: v.array(
          v.object({
            id: v.number(),
            memberCount: v.number(),
            sampleMemoryIds: v.array(v.string()),
          }),
        ),
        memoryCount: v.number(),
        edgeCount: v.number(),
      }),
      v.object({
        status: v.literal("failed"),
        error: v.string(),
        failureTime: v.number(),
      }),
    ),
  }).index("by_namespace", ["namespace"]),

  memoryCommunityAssignments: defineTable({
    namespace: v.string(),
    memoryId: v.string(),
    communityId: v.number(),
    jobId: v.id("memoryCommunityJobs"),
  })
    .index("by_namespace", ["namespace"])
    .index("by_namespace_memoryId", ["namespace", "memoryId"])
    .index("by_namespace_communityId", ["namespace", "communityId"])
    .index("by_jobId", ["jobId"]),
});
