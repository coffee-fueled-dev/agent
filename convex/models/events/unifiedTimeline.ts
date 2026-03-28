import { defineTable } from "convex/server";
import { v } from "convex/values";

const actorOptional = v.optional(
  v.object({
    byType: v.string(),
    byId: v.string(),
  }),
);

/** Capped read model: merged view of events from the events component (audit stays in event_entries). */
export const unifiedTimeline = defineTable({
  partitionKey: v.string(),
  sourceGlobalSequence: v.number(),
  sourceStreamType: v.string(),
  sourceNamespace: v.string(),
  sourceStreamId: v.string(),
  sourceEventId: v.string(),
  eventType: v.string(),
  eventTime: v.number(),
  correlationId: v.optional(v.string()),
  causationId: v.optional(v.string()),
  actor: actorOptional,
  session: v.optional(v.string()),
  metadata: v.optional(
    v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
  ),
})
  .index("by_partition_sequence", ["partitionKey", "sourceGlobalSequence"])
  .index("by_partition", ["partitionKey"])
  .index("by_source_event", [
    "sourceStreamType",
    "sourceNamespace",
    "sourceStreamId",
    "sourceEventId",
  ]);
