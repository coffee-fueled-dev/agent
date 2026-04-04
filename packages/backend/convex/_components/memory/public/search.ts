import { lexicalSearchHitValidator } from "@very-coffee/convex-lexical-search/searchHitValidators";
import { vectorSearchHitValidator } from "@very-coffee/convex-vector-search/searchHitValidators";
import {
  adaptArm,
  fuseRrf,
  type RrfArm,
} from "@very-coffee/reciprocal-rank-fusion";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { createEmbeddingModel } from "../_lib";
import { lexicalSearch, MEMORY_SOURCE_SYSTEM, vectorSearch } from "../search";

export const searchMemory = action({
  args: {
    namespace: v.string(),
    /** Injected by the host app; component env may not include deployment secrets. */
    googleApiKey: v.optional(v.string()),
    /** Text embedded for the primary vector arm (user query only; can be empty if only `embedding` is used). */
    query: v.string(),
    /**
     * Lexical fulltext query; defaults to `query`. Use a richer string (e.g. filename + snippet)
     * without bloating the embedding input.
     */
    lexicalQuery: v.optional(v.string()),
    /** Optional second vector arm (e.g. embedding of an attached search file). */
    embedding: v.optional(v.array(v.float64())),
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
    const embedText = args.query.trim();
    const lexicalText = (args.lexicalQuery ?? args.query).trim();
    const fileEmb = args.embedding;

    if (
      lexicalText.length === 0 &&
      embedText.length === 0 &&
      !fileEmb?.length
    ) {
      return [];
    }

    const topK = args.limit ?? 20;
    const perArm = args.perArmLimit ?? topK;
    const k = args.k ?? 60;

    const lexicalHits =
      lexicalText.length > 0
        ? await lexicalSearch.search(ctx, {
            namespace: args.namespace,
            query: lexicalText,
            limit: perArm,
            sourceSystem: MEMORY_SOURCE_SYSTEM,
          })
        : [];

    let vectorQueryHits: Awaited<ReturnType<typeof vectorSearch.search>> = [];
    if (embedText.length > 0) {
      if (!args.googleApiKey) {
        throw new Error(
          "searchMemory: googleApiKey is required for the query vector arm (host must pass deployment key).",
        );
      }
      const { embeddings } = await createEmbeddingModel(
        args.googleApiKey,
      ).doEmbed({
        values: [embedText],
      });
      const raw = embeddings[0];
      if (!raw) {
        throw new Error("searchMemory: empty embedding");
      }
      vectorQueryHits = await vectorSearch.search(ctx, {
        namespace: args.namespace,
        vector: [...raw],
        limit: perArm,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
      });
    }

    let vectorFileHits: Awaited<ReturnType<typeof vectorSearch.search>> = [];
    if (fileEmb?.length) {
      vectorFileHits = await vectorSearch.search(ctx, {
        namespace: args.namespace,
        vector: [...fileEmb],
        limit: perArm,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
      });
    }

    const arms: RrfArm<string>[] = [];

    if (lexicalHits.length > 0) {
      arms.push({
        armId: "lexical",
        ranked: lexicalHits.map((h) => h.sourceRef),
      });
    }
    if (vectorQueryHits.length > 0) {
      arms.push(
        adaptArm({
          armId: "vectorQuery",
          items: vectorQueryHits,
          getId: (h) => h.sourceRef,
          getScore: (h) =>
            h.propertyHits.length === 0
              ? 0
              : Math.max(...h.propertyHits.map((p) => p._score)),
        }),
      );
    }
    if (vectorFileHits.length > 0) {
      arms.push(
        adaptArm({
          armId: "vectorFile",
          items: vectorFileHits,
          getId: (h) => h.sourceRef,
          getScore: (h) =>
            h.propertyHits.length === 0
              ? 0
              : Math.max(...h.propertyHits.map((p) => p._score)),
        }),
      );
    }

    if (arms.length === 0) {
      return [];
    }

    const fused = fuseRrf(arms, {
      k,
      maxPerArm: perArm,
    });

    const lexicalByRef = new Map(
      lexicalHits.map((h) => [h.sourceRef, h] as const),
    );

    const vectorScore = (h: (typeof vectorQueryHits)[number]) =>
      h.propertyHits.length === 0
        ? 0
        : Math.max(...h.propertyHits.map((p) => p._score));

    const vectorByRef = new Map<string, (typeof vectorQueryHits)[number]>();
    for (const h of vectorQueryHits) {
      const id = h.sourceRef;
      const prev = vectorByRef.get(id);
      if (!prev || vectorScore(h) > vectorScore(prev)) {
        vectorByRef.set(id, h);
      }
    }
    for (const h of vectorFileHits) {
      const id = h.sourceRef;
      const prev = vectorByRef.get(id);
      if (!prev || vectorScore(h) > vectorScore(prev)) {
        vectorByRef.set(id, h);
      }
    }

    return fused.slice(0, topK).map((row) => ({
      sourceRef: row.id,
      rrfScore: row.score,
      contributions: row.contributions,
      lexical: lexicalByRef.get(row.id) ?? null,
      vector: vectorByRef.get(row.id) ?? null,
    }));
  },
});
