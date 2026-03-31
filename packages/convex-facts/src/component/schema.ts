import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  fact_items: defineTable({
    namespace: v.string(),
    entity: v.string(),
    entityType: v.string(),
    scope: v.optional(v.string()),
    state: v.optional(v.string()),
    order: v.array(v.number()),
    labels: v.array(v.string()),
    attrs: v.optional(v.any()),
    sourceVersion: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_namespace_entity", ["namespace", "entity"])
    .index("by_namespace_scope_entityType", [
      "namespace",
      "scope",
      "entityType",
    ])
    .index("by_namespace_entityType", ["namespace", "entityType"]),
  fact_edges: defineTable({
    namespace: v.string(),
    kind: v.string(),
    from: v.string(),
    to: v.string(),
    scope: v.optional(v.string()),
    attrs: v.optional(v.any()),
    sourceVersion: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_namespace_from_kind_to", ["namespace", "from", "kind", "to"])
    .index("by_namespace_to_kind_from", ["namespace", "to", "kind", "from"]),
  fact_partitions: defineTable({
    namespace: v.string(),
    partition: v.string(),
    scope: v.optional(v.string()),
    head: v.optional(v.string()),
    tail: v.optional(v.string()),
    count: v.number(),
    membersVersion: v.optional(v.number()),
    attrs: v.optional(v.any()),
    updatedAt: v.number(),
  }).index("by_namespace_scope_partition", ["namespace", "scope", "partition"]),
  fact_cursors: defineTable({
    projector: v.string(),
    namespace: v.string(),
    cursor: v.optional(v.number()),
    mode: v.union(v.literal("direct"), v.literal("event")),
    updatedAt: v.number(),
  }).index("by_projector_namespace", ["projector", "namespace"]),
});
