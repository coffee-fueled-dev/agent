import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Canonical feature: identity + source link + optional grouping hooks.
 * Searchable strings live in `searchFeatureTextSlices`.
 */
export default defineSchema({
  searchFeatureItems: defineTable({
    namespace: v.string(),
    featureId: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
    updatedAt: v.number(),
    /** Optional bucket for future grouped search / expansion. */
    bucketId: v.optional(v.string()),
    bucketType: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
    sourceVersion: v.optional(v.number()),
  })
    .index("by_namespace_featureId", ["namespace", "featureId"])
    .index("by_sourceSystem_namespace", ["sourceSystem", "namespace"]),

  /**
   * One row per searchable string slice; only this table carries the fulltext index.
   */
  searchFeatureTextSlices: defineTable({
    namespace: v.string(),
    featureId: v.string(),
    /** e.g. `"text"`, `"title"`, `"snippet"` — unique per feature. */
    propKey: v.string(),
    sourceSystem: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_namespace_featureId_propKey", [
      "namespace",
      "featureId",
      "propKey",
    ])
    .index("by_namespace_featureId", ["namespace", "featureId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["namespace", "sourceSystem"],
    }),
});
