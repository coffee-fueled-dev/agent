import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel.js";
import { internal } from "../_generated/api.js";
import { EMBEDDING_DIMENSIONS } from "../schema.js";
import { action } from "../_generated/server.js";
import { vectorSearchHitValidator } from "../searchHitValidators.js";

type VectorSearchHit = {
  _id: Id<"searchItems">;
  _creationTime: number;
  namespace: string;
  sourceSystem: string;
  sourceRef: string;
  updatedAt: number;
  bucketId?: string;
  bucketType?: string;
  supersededAt?: number;
  sourceVersion?: number;
  propertyHits: Array<{ propKey: string; sliceId: string; _score: number }>;
};

type ScoredRow = {
  searchItem: Id<"searchItems">;
  propKey: string;
  sliceId: string;
  sourceSystem: string;
  namespace: string;
  score: number;
};

async function runVectorSearch(
  ctx: GenericActionCtx<DataModel>,
  args: {
    namespace: string;
    vector: number[];
    limit?: number;
    sourceSystem?: string;
  },
): Promise<VectorSearchHit[]> {
  if (args.vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `vectorSearch: expected vector length ${EMBEDDING_DIMENSIONS}, got ${args.vector.length}`,
    );
  }

  const limit = args.limit ?? 20;
  const candidateCap = Math.min(Math.max(limit * 4, 40), 256);

  const rawHits = await ctx.vectorSearch("searchEmbeddings", "search_embedding", {
    vector: args.vector,
    limit: candidateCap,
    filter: (q) => q.eq("namespace", args.namespace),
  });

  const scored: ScoredRow[] = await ctx.runQuery(
    internal.internal.load.loadEmbeddingRowsForHits,
    {
      hits: rawHits.map((h) => ({ id: h._id, score: h._score })),
    },
  );

  const filtered: ScoredRow[] = args.sourceSystem
    ? scored.filter((r) => r.sourceSystem === args.sourceSystem)
    : scored;

  filtered.sort((a: ScoredRow, b: ScoredRow) => b.score - a.score);

  const orderedItemIds: Id<"searchItems">[] = [];
  const selectedItems = new Set<Id<"searchItems">>();
  for (const row of filtered) {
    if (selectedItems.has(row.searchItem)) continue;
    selectedItems.add(row.searchItem);
    orderedItemIds.push(row.searchItem);
    if (orderedItemIds.length >= limit) break;
  }

  const propertyHitsByItem = new Map<
    Id<"searchItems">,
    Array<{ propKey: string; sliceId: string; _score: number }>
  >();
  for (const row of filtered) {
    if (!selectedItems.has(row.searchItem)) continue;
    const list = propertyHitsByItem.get(row.searchItem) ?? [];
    list.push({
      propKey: row.propKey,
      sliceId: row.sliceId,
      _score: row.score,
    });
    propertyHitsByItem.set(row.searchItem, list);
  }

  if (orderedItemIds.length === 0) {
    return [];
  }

  const items: Doc<"searchItems">[] = await ctx.runQuery(
    internal.internal.load.loadItemsBySearchItemIds,
    {
      searchItemIds: orderedItemIds,
    },
  );

  const itemById = new Map<string, Doc<"searchItems">>(
    items.map((it: Doc<"searchItems">) => [it._id as string, it]),
  );

  const out: VectorSearchHit[] = [];

  for (const itemId of orderedItemIds) {
    const canonical = itemById.get(itemId as string);
    const propertyHits = propertyHitsByItem.get(itemId);
    if (!canonical || !propertyHits) continue;

    out.push({
      ...canonical,
      propertyHits,
    });
  }

  return out;
}

/**
 * k-NN vector search over stored embeddings. Runs in an action; use {@link SearchClient.search}
 * with `runAction`.
 */
export const vectorSearch = action({
  args: {
    namespace: v.string(),
    vector: v.array(v.float64()),
    limit: v.optional(v.number()),
    sourceSystem: v.optional(v.string()),
  },
  returns: v.array(vectorSearchHitValidator),
  handler: async (ctx, args) => runVectorSearch(ctx, args),
});
