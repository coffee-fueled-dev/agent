import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contextEntryEmbeddings = defineTable({
  entryId: v.string(),
  namespace: v.string(),
  embedding: v.array(v.number()),
  createdAt: v.number(),
})
  .index("by_entryId", ["entryId"])
  .index("by_namespace_createdAt", ["namespace", "createdAt"]);
