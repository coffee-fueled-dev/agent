import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel.js";
import { internalQuery } from "../_generated/server.js";

/** Load embedding rows for vector hits (action cannot use db.get). */
export const loadEmbeddingRowsForHits = internalQuery({
  args: {
    hits: v.array(
      v.object({
        id: v.id("searchEmbeddings"),
        score: v.number(),
      }),
    ),
  },
  returns: v.array(
    v.object({
      searchItem: v.id("searchItems"),
      propKey: v.string(),
      sliceId: v.string(),
      sourceSystem: v.string(),
      namespace: v.string(),
      score: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const out: Array<{
      searchItem: Id<"searchItems">;
      propKey: string;
      sliceId: string;
      sourceSystem: string;
      namespace: string;
      score: number;
    }> = [];
    for (const h of args.hits) {
      const row = await ctx.db.get("searchEmbeddings", h.id);
      if (!row) continue;
      out.push({
        searchItem: row.searchItem,
        propKey: row.propKey,
        sliceId: row.sliceId,
        sourceSystem: row.sourceSystem,
        namespace: row.namespace,
        score: h.score,
      });
    }
    return out;
  },
});

export const loadItemsBySearchItemIds = internalQuery({
  args: {
    searchItemIds: v.array(v.id("searchItems")),
  },
  returns: v.array(
    v.object({
      _id: v.id("searchItems"),
      _creationTime: v.number(),
      namespace: v.string(),
      sourceSystem: v.string(),
      sourceRef: v.string(),
      updatedAt: v.number(),
      bucketId: v.optional(v.string()),
      bucketType: v.optional(v.string()),
      supersededAt: v.optional(v.number()),
      sourceVersion: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const out: Doc<"searchItems">[] = [];
    for (const id of args.searchItemIds) {
      const item = await ctx.db.get("searchItems", id);
      if (item) out.push(item);
    }
    return out;
  },
});
