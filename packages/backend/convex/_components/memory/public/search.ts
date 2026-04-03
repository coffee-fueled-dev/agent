import { lexicalSearchHitValidator } from "@very-coffee/convex-lexical-search/searchHitValidators";
import { vectorSearchHitValidator } from "@very-coffee/convex-vector-search/searchHitValidators";
import { adaptArm, fuseRrf } from "@very-coffee/reciprocal-rank-fusion";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { createEmbeddingModel } from "../_lib";
import { lexicalSearch, MEMORY_SOURCE_SYSTEM, vectorSearch } from "../search";

export const searchMemory = action({
  args: {
    namespace: v.string(),
    query: v.string(),
    /** Max results after RRF (default 20). */
    limit: v.optional(v.number()),
    /** Max candidates per arm before fusion (default: same as `limit` or 20). */
    perArmLimit: v.optional(v.number()),
    /** RRF constant (default 60). */
    k: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      sourceRef: v.string(),
      rrfScore: v.number(),
      contributions: v.array(
        v.object({
          armId: v.string(),
          rank: v.number(),
          score: v.number(),
        }),
      ),
      lexical: v.union(v.null(), lexicalSearchHitValidator),
      vector: v.union(v.null(), vectorSearchHitValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length === 0) {
      return [];
    }

    const topK = args.limit ?? 20;
    const perArm = args.perArmLimit ?? topK;

    const { embeddings } = await createEmbeddingModel().doEmbed({
      values: [q],
    });
    const raw = embeddings[0];
    if (!raw) {
      throw new Error("searchMemory: empty embedding");
    }
    const vector = [...raw];

    const [lexicalHits, vectorHits] = await Promise.all([
      lexicalSearch.search(ctx, {
        namespace: args.namespace,
        query: q,
        limit: perArm,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
      }),
      vectorSearch.vectorSearch(ctx, {
        namespace: args.namespace,
        vector,
        limit: perArm,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
      }),
    ]);

    const lexicalArm = {
      armId: "lexical",
      ranked: lexicalHits.map((h) => h.sourceRef),
    };

    const vectorArm = adaptArm({
      armId: "vector",
      items: vectorHits,
      getId: (h) => h.sourceRef,
      getScore: (h) =>
        h.propertyHits.length === 0
          ? 0
          : Math.max(...h.propertyHits.map((p) => p._score)),
    });

    const fused = fuseRrf([lexicalArm, vectorArm], {
      k: args.k ?? 60,
      maxPerArm: perArm,
    });

    const lexicalByRef = new Map(
      lexicalHits.map((h) => [h.sourceRef, h] as const),
    );
    const vectorByRef = new Map(
      vectorHits.map((h) => [h.sourceRef, h] as const),
    );

    return fused.slice(0, topK).map((row) => ({
      sourceRef: row.id,
      rrfScore: row.score,
      contributions: row.contributions,
      lexical: lexicalByRef.get(row.id) ?? null,
      vector: vectorByRef.get(row.id) ?? null,
    }));
  },
});
