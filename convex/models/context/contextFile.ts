import { defineTable } from "convex/server";
import { zid, zodOutputToConvex } from "convex-helpers/server/zod4";
import z from "zod";

export const zContextFile = z.object({
  entryId: z.string(),
  namespace: z.string(),
  storageId: zid("_storage"),
  mimeType: z.string(),
  fileName: z.string().optional(),
});

export const contextFiles = defineTable(zodOutputToConvex(zContextFile))
  .index("by_entryId", ["entryId"])
  .index("by_namespace", ["namespace"]);
