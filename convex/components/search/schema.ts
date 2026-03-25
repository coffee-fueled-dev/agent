import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  searchFeatures: defineTable({
    namespace: v.string(),
    featureId: v.string(),
    sourceSystem: v.string(),
    source: v.union(
      v.object({
        kind: v.literal("document"),
        document: v.string(),
        documentId: v.string(),
        entryId: v.string(),
        key: v.string(),
        sourceType: v.union(v.literal("text"), v.literal("binary")),
      }),
      v.object({
        kind: v.literal("content"),
        contentId: v.string(),
        sourceType: v.union(v.literal("text"), v.literal("binary")),
      }),
    ),
    title: v.optional(v.string()),
    text: v.string(),
    status: v.union(v.literal("current"), v.literal("historical")),
    updatedAt: v.number(),
  })
    .index("by_namespace_featureId", ["namespace", "featureId"])
    .index("by_sourceSystem_namespace_status", [
      "sourceSystem",
      "namespace",
      "status",
    ])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["namespace", "status", "sourceSystem"],
    }),
});
