import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  history_entries: defineTable({
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    kind: v.string(),
    payload: v.optional(v.any()),
    parentEntryIds: v.array(v.string()),
    entryTime: v.number(),
    attrs: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null()),
      ),
    ),
  })
    .index("by_stream_entry", ["streamType", "streamId", "entryId"])
    .index("by_stream_time", ["streamType", "streamId", "entryTime"]),
  history_parent_edges: defineTable({
    streamType: v.string(),
    streamId: v.string(),
    childEntryId: v.string(),
    parentEntryId: v.string(),
    parentOrder: v.number(),
  })
    .index("by_stream_child_order", [
      "streamType",
      "streamId",
      "childEntryId",
      "parentOrder",
      "parentEntryId",
    ])
    .index("by_stream_parent_child", [
      "streamType",
      "streamId",
      "parentEntryId",
      "childEntryId",
    ]),
  history_heads: defineTable({
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    headKind: v.optional(v.string()),
  }).index("by_stream_entry", ["streamType", "streamId", "entryId"]),
});
