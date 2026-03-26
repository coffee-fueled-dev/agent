import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import z from "zod";

export const zEmbeddingCache = z.object({
  contentHash: z.string(),
  embedding: z.array(z.number()),
  mimeType: z.string(),
  createdAt: z.number(),
});

export const embeddingCache = defineTable(
  zodOutputToConvex(zEmbeddingCache),
).index("by_contentHash", ["contentHash"]);
