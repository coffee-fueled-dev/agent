import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { z } from "zod";

const zProjectionPoint = z.object({
  entryId: z.string(),
  chartId: z.string(),
  chartKey: z.string(),
  key: z.string(),
  title: z.string().nullable(),
  sourceType: z.enum(["text", "textFile", "binaryFile"]),
  mimeType: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const zMemoryProjectionJob = z.object({
  namespace: z.string(),
  chartIds: z.array(z.string()),
  query: z.string(),
  limit: z.number(),
  workflowId: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  phase: z.enum([
    "queued",
    "resolvingCharts",
    "loadingMembers",
    "projecting",
    "completed",
    "failed",
  ]),
  resolvedChartCount: z.number().optional(),
  loadedPointCount: z.number().optional(),
  points: z.array(zProjectionPoint).optional(),
  lastError: z.string().nullable().optional(),
  completedAt: z.number().optional(),
  failedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const memoryProjectionJobs = defineTable(
  zodOutputToConvex(zMemoryProjectionJob),
)
  .index("by_namespace_createdAt", ["namespace", "createdAt"])
  .index("by_status_createdAt", ["status", "createdAt"]);
