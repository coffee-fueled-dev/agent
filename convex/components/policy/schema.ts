import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const metadataValidator = v.optional(
  v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
);

const lastUpdateValidator = v.object({
  time: v.number(),
  byType: v.string(),
  byId: v.string(),
  reason: v.optional(v.string()),
  source: v.optional(v.string()),
});

export default defineSchema({
  scope_nodes: defineTable({
    scopeType: v.string(),
    scopeId: v.string(),
    attrs: metadataValidator,
    lastUpdate: lastUpdateValidator,
  }).index("by_scope", ["scopeType", "scopeId"]),
  scope_edges: defineTable({
    fromType: v.string(),
    fromId: v.string(),
    relation: v.string(),
    toType: v.string(),
    toId: v.string(),
    attrs: metadataValidator,
    lastUpdate: lastUpdateValidator,
  })
    .index("by_from", ["fromType", "fromId", "relation", "toType", "toId"])
    .index("by_to", ["toType", "toId", "relation", "fromType", "fromId"]),
  access_policies: defineTable({
    subjectType: v.string(),
    subjectId: v.string(),
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    effect: v.union(v.literal("allow"), v.literal("deny")),
    activeTime: v.union(v.number(), v.null()),
    expiredTime: v.union(v.number(), v.null()),
    attrs: metadataValidator,
    lastUpdate: lastUpdateValidator,
  })
    .index("by_subject_resource_action", [
      "subjectType",
      "subjectId",
      "resourceType",
      "action",
      "resourceId",
    ])
    .index("by_resource", [
      "resourceType",
      "resourceId",
      "action",
      "subjectType",
      "subjectId",
    ]),
  entitlement_policies: defineTable({
    subjectType: v.string(),
    subjectId: v.string(),
    namespace: v.string(),
    action: v.string(),
    effect: v.union(v.literal("allow"), v.literal("deny")),
    activeTime: v.union(v.number(), v.null()),
    expiredTime: v.union(v.number(), v.null()),
    attrs: metadataValidator,
    lastUpdate: lastUpdateValidator,
  })
    .index("by_subject_namespace_action", [
      "subjectType",
      "subjectId",
      "namespace",
      "action",
    ])
    .index("by_namespace", ["namespace", "action", "subjectType", "subjectId"]),
});
