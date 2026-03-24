import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contextEntryVersions = defineTable({
  entryId: v.string(),
  namespace: v.string(),
  key: v.string(),
  data: v.union(
    v.object({ status: v.literal("current") }),
    v.object({
      status: v.literal("historical"),
      replacedByEntryId: v.string(),
      replacedAt: v.number(),
    }),
  ),
  createdAt: v.number(),
})
  .index("by_entryId", ["entryId"])
  .index("by_namespace_key", ["namespace", "key"]);
