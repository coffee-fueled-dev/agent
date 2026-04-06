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

const armBiasValidator = v.optional(
  v.object({
    /** Relative weight for full-text (Tantivy/BM25) matches; normalized with other active arms. */
    lexical: v.optional(v.number()),
    /** Relative weight for embedding similarity using `query` (and `lexicalQuery` does not affect this arm). */
    vectorQuery: v.optional(v.number()),
    /** Relative weight for embedding similarity when a file/hybrid vector arm is used. */
    vectorFile: v.optional(v.number()),
  }),
);

export type ArmBiasInput = {
  lexical?: number;
  vectorQuery?: number;
  vectorFile?: number;
};

/** Non-negative weights per arm; sums to 1 over arms that are eligible (input allows that arm). */
export function normalizeArmBiasWeights(
  bias: ArmBiasInput | undefined,
  active: {
    lexical: boolean;
    vectorQuery: boolean;
    vectorFile: boolean;
  },
): { lexical: number; vectorQuery: number; vectorFile: number } {
  const raw = (key: keyof ArmBiasInput): number => {
    if (!active[key]) return 0;
    const x = bias?.[key];
    const w = x !== undefined ? x : 1;
    return Number.isFinite(w) && w >= 0 ? w : 0;
  };
  const lex = raw("lexical");
  const vq = raw("vectorQuery");
  const vf = raw("vectorFile");
  const sum = lex + vq + vf;
  if (sum <= 0) {
    const n =
      Number(active.lexical) +
      Number(active.vectorQuery) +
      Number(active.vectorFile);
    const eq = n > 0 ? 1 / n : 0;
    return {
      lexical: active.lexical ? eq : 0,
      vectorQuery: active.vectorQuery ? eq : 0,
      vectorFile: active.vectorFile ? eq : 0,
    };
  }
  return {
    lexical: lex / sum,
    vectorQuery: vq / sum,
    vectorFile: vf / sum,
  };
}

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
    /**
     * Relative importance of each retrieval arm before RRF fusion. Values are non-negative;
     * normalized to sum to 1 across **eligible** arms only (lexical if `lexicalQuery`/`query` text;
     * vectorQuery if `query` non-empty for embedding; vectorFile if `embedding` set).
     * Omitted keys default to 1 before normalization. A normalized weight of 0 skips that arm (no query).
     */
    armBias: armBiasValidator,
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

    const eligible = {
      lexical: lexicalText.length > 0,
      vectorQuery: embedText.length > 0,
      vectorFile: Boolean(fileEmb?.length),
    };
    const w = normalizeArmBiasWeights(args.armBias ?? undefined, eligible);

    const lexicalHits =
      eligible.lexical && w.lexical > 0
        ? await lexicalSearch.search(ctx, {
            namespace: args.namespace,
            query: lexicalText,
            limit: perArm,
            sourceSystem: MEMORY_SOURCE_SYSTEM,
          })
        : [];

    let vectorQueryHits: Awaited<ReturnType<typeof vectorSearch.search>> = [];
    if (eligible.vectorQuery && w.vectorQuery > 0) {
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
    if (w.vectorFile > 0 && fileEmb && fileEmb.length > 0) {
      vectorFileHits = await vectorSearch.search(ctx, {
        namespace: args.namespace,
        vector: [...fileEmb],
        limit: perArm,
        sourceSystem: MEMORY_SOURCE_SYSTEM,
      });
    }

    const active = {
      lexical: lexicalHits.length > 0,
      vectorQuery: vectorQueryHits.length > 0,
      vectorFile: vectorFileHits.length > 0,
    };

    const arms: RrfArm<string>[] = [];

    if (active.lexical && w.lexical > 0) {
      arms.push({
        armId: "lexical",
        ranked: lexicalHits.map((h) => h.sourceRef),
        weight: w.lexical,
      });
    }
    if (active.vectorQuery && w.vectorQuery > 0) {
      arms.push(
        adaptArm({
          armId: "vectorQuery",
          items: vectorQueryHits,
          getId: (h) => h.sourceRef,
          getScore: (h) =>
            h.propertyHits.length === 0
              ? 0
              : Math.max(...h.propertyHits.map((p) => p._score)),
          weight: w.vectorQuery,
        }),
      );
    }
    if (active.vectorFile && w.vectorFile > 0) {
      arms.push(
        adaptArm({
          armId: "vectorFile",
          items: vectorFileHits,
          getId: (h) => h.sourceRef,
          getScore: (h) =>
            h.propertyHits.length === 0
              ? 0
              : Math.max(...h.propertyHits.map((p) => p._score)),
          weight: w.vectorFile,
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
