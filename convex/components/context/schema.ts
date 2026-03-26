import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const sourceValidator = v.union(
  v.object({
    kind: v.literal("document"),
    sourceType: v.union(v.literal("text"), v.literal("binary")),
    document: v.string(),
    documentId: v.string(),
    entryId: v.string(),
    key: v.string(),
  }),
  v.object({
    kind: v.literal("content"),
    sourceType: v.union(v.literal("text"), v.literal("binary")),
    contentId: v.string(),
  }),
);

export const pointValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textPreview: v.string(),
  mimeType: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  z: v.number(),
});

export const versionDataValidator = v.union(
  v.object({ status: v.literal("current") }),
  v.object({
    status: v.literal("historical"),
    replacedByEntryId: v.string(),
    replacementTime: v.number(),
  }),
);

export default defineSchema({
  contextEntries: defineTable({
    namespace: v.string(),
    entryId: v.string(),
    key: v.string(),
    source: sourceValidator,
    title: v.optional(v.string()),
    textPreview: v.string(),
    legacyEntryId: v.optional(v.string()),
  })
    .index("by_namespace", ["namespace"])
    .index("by_legacyEntryId", ["legacyEntryId"]),
  contextEntryEmbeddings: defineTable({
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
  })
    .index("by_entryId", ["entryId"])
    .index("by_namespace", ["namespace"]),
  contextEntryVersions: defineTable({
    entryId: v.string(),
    namespace: v.string(),
    key: v.string(),
    data: versionDataValidator,
  })
    .index("by_entryId", ["entryId"])
    .index("by_namespace_key", ["namespace", "key"]),
  contextProjectionJobs: defineTable({
    namespace: v.string(),
    limit: v.number(),
    stale: v.boolean(),
    updateTime: v.number(),
    data: v.union(
      v.object({ status: v.literal("pending") }),
      v.object({
        status: v.literal("running"),
        workflowId: v.string(),
        phase: v.union(v.literal("loading"), v.literal("projecting")),
        loadedCount: v.number(),
      }),
      v.object({
        status: v.literal("completed"),
        points: v.array(pointValidator),
        completionTime: v.number(),
      }),
      v.object({
        status: v.literal("failed"),
        error: v.string(),
        failureTime: v.number(),
      }),
    ),
  }).index("by_namespace", ["namespace"]),

  contextCommunityJobs: defineTable({
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
        workflowId: v.string(),
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
            sampleEntryIds: v.array(v.string()),
          }),
        ),
        entryCount: v.number(),
        edgeCount: v.number(),
      }),
      v.object({
        status: v.literal("failed"),
        error: v.string(),
        failureTime: v.number(),
      }),
    ),
  }).index("by_namespace", ["namespace"]),

  contextCommunityAssignments: defineTable({
    namespace: v.string(),
    entryId: v.string(),
    communityId: v.number(),
    jobId: v.id("contextCommunityJobs"),
  })
    .index("by_namespace_entryId", ["namespace", "entryId"])
    .index("by_namespace_communityId", ["namespace", "communityId"])
    .index("by_jobId", ["jobId"]),
});
