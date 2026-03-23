import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contextEntries: defineTable({
    namespace: v.string(),
    entryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    createdAt: v.number(),
  }).index("by_namespace_createdAt", ["namespace", "createdAt"]),
});
