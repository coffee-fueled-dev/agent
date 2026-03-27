import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const metadataValidator = v.optional(
  v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
);

const actorValidator = v.optional(
  v.object({
    byType: v.string(),
    byId: v.string(),
  }),
);

export default defineSchema({
  event_streams: defineTable({
    streamType: v.string(),
    namespace: v.string(),
    streamId: v.string(),
    version: v.number(),
    lastEventSequence: v.union(v.number(), v.null()),
    createdTime: v.number(),
    updatedTime: v.number(),
  }).index("by_stream", ["streamType", "namespace", "streamId"]),

  event_entries: defineTable({
    globalSequence: v.number(),
    streamType: v.string(),
    namespace: v.string(),
    streamId: v.string(),
    streamVersion: v.number(),
    eventId: v.string(),
    eventType: v.string(),
    payload: v.optional(v.any()),
    metadata: metadataValidator,
    causationId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    actor: actorValidator,
    session: v.optional(v.string()),
    eventTime: v.number(),
  })
    .index("by_global_sequence", ["globalSequence"])
    .index("by_stream_version", [
      "streamType",
      "namespace",
      "streamId",
      "streamVersion",
    ])
    .index("by_stream_event_time", [
      "streamType",
      "namespace",
      "streamId",
      "eventTime",
    ])
    .index("by_stream_event", [
      "streamType",
      "namespace",
      "streamId",
      "eventId",
    ])
    .index("by_type_sequence", ["streamType", "globalSequence"]),

  event_projector_checkpoints: defineTable({
    projector: v.string(),
    streamType: v.string(),
    lastSequence: v.number(),
    updatedTime: v.number(),
    leaseOwner: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.number()),
  }).index("by_projector_stream", ["projector", "streamType"]),
});
