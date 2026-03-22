import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { z } from "zod";

const zBinaryEmbeddingMetadataValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const zBinaryEmbeddingProcess = z.object({
  status: z.enum(["pending", "dispatched", "completed", "failed"]),
  storageId: z.string(),
  namespace: z.string(),
  key: z.string(),
  title: z.string().optional(),
  text: z.string().optional(),
  mimeType: z.string(),
  fileName: z.string().nullable().optional(),
  metadata: z.record(z.string(), zBinaryEmbeddingMetadataValue).optional(),
  indexKind: z.enum(["current", "historical"]).optional(),
  sourceKind: z.string().optional(),
  streamType: z.string().optional(),
  streamId: z.string().optional(),
  sourceEntryId: z.string().optional(),
  entity: z.string().optional(),
  entityType: z.string().optional(),
  sourceVersion: z.number().optional(),
  entryTime: z.number().optional(),
  validFrom: z.number().optional(),
  validTo: z.number().nullable().optional(),
  scope: z.string().optional(),
  attemptCount: z.number(),
  dispatchedAt: z.number().optional(),
  completedAt: z.number().optional(),
  failedAt: z.number().optional(),
  lastError: z.string().nullable().optional(),
  retrievalText: z.string().optional(),
  entryId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const binaryEmbeddingProcesses = defineTable(
  zodOutputToConvex(zBinaryEmbeddingProcess),
)
  .index("by_status_createdAt", ["status", "createdAt"])
  .index("by_namespace_createdAt", ["namespace", "createdAt"])
  .index("by_storageId_createdAt", ["storageId", "createdAt"])
  .index("by_entryId", ["entryId"]);
