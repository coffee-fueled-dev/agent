import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const attrTypeValidator = v.union(
  v.literal("string"),
  v.literal("number"),
  v.literal("boolean"),
);

const metadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export default defineSchema({
  runtimeRegistrations: defineTable({
    runtime: v.string(),
    description: v.optional(v.string()),
    historyStreamType: v.string(),
    factEntities: v.array(
      v.object({
        entityType: v.string(),
        states: v.array(v.string()),
        attrs: v.record(v.string(), attrTypeValidator),
      }),
    ),
    factEdgeKinds: v.array(v.string()),
    factPartitions: v.array(v.string()),
    factsNamespaceSuffix: v.string(),
    currentNamespaceSuffix: v.string(),
    historicalNamespaceSuffix: v.string(),
    currentSourceKinds: v.optional(v.array(v.string())),
    historicalSourceKinds: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_runtime", ["runtime"]),

  runtimeStreams: defineTable({
    runtime: v.string(),
    streamId: v.string(),
    factsNamespace: v.string(),
    currentNamespace: v.string(),
    historicalNamespace: v.string(),
    latestVersion: v.number(),
    latestEntryId: v.optional(v.string()),
    latestEntryTime: v.optional(v.number()),
    latestEntity: v.optional(v.string()),
    lastCommitKey: v.optional(v.string()),
    lastWorkId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_runtime_stream", ["runtime", "streamId"])
    .index("by_runtime_lastWorkId", ["runtime", "lastWorkId"]),

  runtimeCommitLog: defineTable({
    runtime: v.string(),
    streamId: v.string(),
    commitKey: v.string(),
    workId: v.optional(v.string()),
    state: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    attempts: v.number(),
    error: v.optional(v.string()),
    entryId: v.optional(v.string()),
    sourceVersion: v.optional(v.number()),
    entryTime: v.optional(v.number()),
    currentKey: v.optional(v.string()),
    historicalKey: v.optional(v.string()),
    payload: v.optional(v.record(v.string(), metadataValueValidator)),
    queuedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_runtime_stream_commitKey", ["runtime", "streamId", "commitKey"])
    .index("by_workId", ["workId"]),
});
