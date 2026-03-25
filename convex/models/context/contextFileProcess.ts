import { defineTable } from "convex/server";
import { zid, zodOutputToConvex } from "convex-helpers/server/zod4";
import z from "zod";

export const contextFileProcessStatuses = [
  "pending",
  "dispatched",
  "completed",
  "failed",
] as const;

export const zContextFileProcess = z.object({
  storageId: zid("_storage"),
  namespace: z.string(),
  key: z.string(),
  title: z.string().optional(),
  mimeType: z.string(),
  fileName: z.string().optional(),
  updatedAt: z.number(),
  data: z.discriminatedUnion("status", [
    z.object({ status: z.literal("pending") }),
    z.object({ status: z.literal("dispatched") }),
    z.object({ status: z.literal("completed"), entryId: z.string() }),
    z.object({ status: z.literal("failed"), error: z.string() }),
  ]),
});

export const contextFileProcesses = defineTable(
  zodOutputToConvex(zContextFileProcess),
);
