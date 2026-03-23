import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contextFileProcesses = defineTable({
  status: v.union(
    v.literal("pending"),
    v.literal("dispatched"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  storageId: v.id("_storage"),
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  mimeType: v.string(),
  fileName: v.optional(v.string()),
  entryId: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_status", ["status"]);
