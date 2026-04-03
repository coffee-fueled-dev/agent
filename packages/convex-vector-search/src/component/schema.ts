import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Must match `vectorIndex.dimensions` and the embedding model you use. */
export const EMBEDDING_DIMENSIONS = 3072 as const;

export default defineSchema({
  searchItems: defineTable({
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
    updatedAt: v.number(),
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

  searchEmbeddings: defineTable({
    namespace: v.string(),
    searchItem: v.id("searchItems"),
    propKey: v.string(),
    /** Disambiguates multiple vectors under the same `propKey` (e.g. chunks). */
    sliceId: v.string(),
    sourceSystem: v.string(),
    embedding: v.array(v.float64()),
    updatedAt: v.number(),
  })
    .index("by_namespace_searchItem_propKey_sliceId", [
      "namespace",
      "searchItem",
      "propKey",
      "sliceId",
    ])
    .index("by_namespace_searchItem", ["namespace", "searchItem"])
    .vectorIndex("search_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
      filterFields: ["namespace"],
    }),
});
