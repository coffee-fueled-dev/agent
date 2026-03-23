import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contextFiles = defineTable({
  entryId: v.string(),
  namespace: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileName: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_entryId", ["entryId"])
  .index("by_namespace_createdAt", ["namespace", "createdAt"]);
