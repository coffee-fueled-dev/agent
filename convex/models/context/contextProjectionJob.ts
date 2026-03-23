import { defineTable } from "convex/server";
import { v } from "convex/values";

const pointValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textPreview: v.string(),
  mimeType: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  z: v.number(),
});

export const contextProjectionJobs = defineTable({
  namespace: v.string(),
  limit: v.number(),
  stale: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  data: v.union(
    v.object({ status: v.literal("pending") }),
    v.object({
      status: v.literal("running"),
      workflowId: v.string(),
      phase: v.union(v.literal("loading"), v.literal("projecting")),
      loadedCount: v.number(),
    }),
    v.object({
      status: v.literal("completed"),
      points: v.array(pointValidator),
      completedAt: v.number(),
    }),
    v.object({
      status: v.literal("failed"),
      error: v.string(),
      failedAt: v.number(),
    }),
  ),
}).index("by_namespace_createdAt", ["namespace", "createdAt"]);
