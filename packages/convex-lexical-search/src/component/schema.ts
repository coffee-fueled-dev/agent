import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Canonical item: identity + source link + optional grouping hooks.
 * Searchable strings live in `searchTexts`.
 */
export default defineSchema({
  searchItems: defineTable({
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
    updatedAt: v.number(),
    /** Optional bucket for future grouped search / expansion. */
    bucketId: v.optional(v.string()),
    bucketType: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
    sourceVersion: v.optional(v.number()),
  })
    .index("by_namespace", ["namespace"])
    .index("by_sourceSystem_namespace", ["sourceSystem", "namespace"])
    .index("by_namespace_sourceSystem_sourceRef", [
      "namespace",
      "sourceSystem",
      "sourceRef",
    ]),

  /**
   * One row per searchable string slice; only this table carries the fulltext index.
   */
  searchTexts: defineTable({
    namespace: v.string(),
    searchItem: v.id("searchItems"),
    /** e.g. `"text"`, `"title"`, `"snippet"` — unique per item. */
    propKey: v.string(),
    sourceSystem: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_namespace_searchItem_propKey", [
      "namespace",
      "searchItem",
      "propKey",
    ])
    .index("by_namespace_searchItem", ["namespace", "searchItem"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["namespace", "sourceSystem"],
    }),
});
