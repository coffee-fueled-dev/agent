import { fuseRrf } from "@very-coffee/reciprocal-rank-fusion";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { graph } from "../graph";
import { createMemoryRag } from "../rag";
import { search as searchClient } from "../search";

type SearchHit = {
  memoryId: string;
  key: string;
  title: string | undefined;
  text: string;
  score: number;
};

export const searchMemory = action({
  args: {
    namespace: v.string(),
    query: v.union(v.string(), v.array(v.number())),
    limit: v.optional(v.number()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    rrfK: v.optional(v.number()),
    vectorWeight: v.optional(v.number()),
    lexicalWeight: v.optional(v.number()),
    graphWeight: v.optional(v.number()),
    fileEmbeddings: v.optional(v.array(v.array(v.number()))),
    apiKey: v.optional(v.string()),
    minScore: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      memoryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      text: v.string(),
      score: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rag = createMemoryRag(args.apiKey);
    const mode = args.retrievalMode ?? "hybrid";
    const limit = args.limit ?? 10;
    const candidateLimit = Math.max(limit * 3, 20);
    const effectiveK = args.rrfK ?? Math.max(candidateLimit, 60);

    const minScore = args.minScore;
    const mergeAndFilter = async (hits: SearchHit[]): Promise<SearchHit[]> => {
      if (minScore === undefined) return hits;
      return hits.filter((h) => h.score >= minScore);
    };

    const runVectorQuery = async (
      query: string | number[],
      overrideLimit?: number,
    ): Promise<SearchHit[]> => {
      const { entries, results } = await rag.search(ctx, {
        namespace: args.namespace,
        query,
        limit: overrideLimit ?? args.limit,
        filters: [{ name: "status", value: "current" }],
      });
      return entries.map((entry) => ({
        memoryId: entry.entryId,
        key: entry.key ?? entry.entryId,
        title: entry.title,
        text: entry.text,
        score: results
          .filter((r) => r.entryId === entry.entryId)
          .reduce((max, r) => Math.max(max, r.score), 0),
      }));
    };

    const isStringQuery = typeof args.query === "string";
    const hasText =
      isStringQuery && (args.query as string).trim().length > 0;
    const fileEmbeddingsList =
      args.fileEmbeddings && args.fileEmbeddings.length > 0
        ? args.fileEmbeddings
        : undefined;

    if (mode === "vector") {
      if (!fileEmbeddingsList?.length) {
        if (isStringQuery && !hasText) return [];
        return mergeAndFilter(await runVectorQuery(args.query));
      }
      const textVector = hasText
        ? await runVectorQuery(args.query, candidateLimit)
        : [];
      const fileVectors = await Promise.all(
        fileEmbeddingsList.map((emb) => runVectorQuery(emb, candidateLimit)),
      );
      const nonempty = fileVectors.filter((fv) => fv.length);
      if (!textVector.length && !nonempty.length) return [];
      const byId = new Map<string, SearchHit>();
      for (const r of textVector) byId.set(r.memoryId, r);
      for (const fv of fileVectors) {
        for (const r of fv) byId.set(r.memoryId, r);
      }
      const vecLists: string[][] = [];
      const weights: number[] = [];
      const vw = args.vectorWeight ?? 1;
      if (textVector.length) {
        vecLists.push(textVector.map((r) => r.memoryId));
        weights.push(vw);
      }
      for (const fv of nonempty) {
        vecLists.push(fv.map((r) => r.memoryId));
        weights.push(vw);
      }
      const fused = fuseRrf(
        vecLists.map((ranked, i) => ({
          armId: `vec-${i}`,
          ranked,
          weight: weights[i] ?? 1,
        })),
        { k: effectiveK },
      );
      return mergeAndFilter(
        fused
          .slice(0, limit)
          .map((row) => {
            const hit = byId.get(row.id);
            if (!hit) return null;
            return { ...hit, score: row.score };
          })
          .filter((x): x is SearchHit => x != null),
      );
    }

    const lexicalQuery = hasText ? (args.query as string) : null;
    const lexicalRows = lexicalQuery
      ? await searchClient.search(ctx, {
          namespace: args.namespace,
          query: lexicalQuery,
          limit: candidateLimit,
          sourceSystem: "memory",
        })
      : [];

    const lexicalMeta = await ctx.runQuery(
      internal.internal.memoryStore.getBatchByMemoryIds,
      {
        namespace: args.namespace,
        memoryIds: lexicalRows.map((r) => r.sourceRef),
      },
    );

    const lexicalMapped: SearchHit[] = lexicalRows.map((r, index) => {
      const meta = lexicalMeta[index];
      const memoryId = r.sourceRef;
      return {
        memoryId,
        key: meta?.key ?? memoryId,
        title: meta?.title ?? r.title,
        text: r.text,
        score: 1 / (index + 1),
      };
    });

    if (mode === "lexical") {
      return mergeAndFilter(lexicalMapped.slice(0, limit));
    }

    const textVector =
      !fileEmbeddingsList?.length && (!isStringQuery || !hasText)
        ? []
        : !fileEmbeddingsList?.length
          ? await runVectorQuery(args.query, candidateLimit)
          : hasText
            ? await runVectorQuery(args.query, candidateLimit)
            : [];

    const fileVectorsResults = fileEmbeddingsList?.length
      ? await Promise.all(
          fileEmbeddingsList.map((emb) =>
            runVectorQuery(emb, candidateLimit),
          ),
        )
      : [];

    const rankedLists: string[][] = [];
    const weights: number[] = [];
    const vw = args.vectorWeight ?? 1;
    if (textVector.length) {
      rankedLists.push(textVector.map((r) => r.memoryId));
      weights.push(vw);
    }
    if (lexicalMapped.length) {
      rankedLists.push(lexicalMapped.map((r) => r.memoryId));
      weights.push(args.lexicalWeight ?? 1);
    }
    for (const fv of fileVectorsResults) {
      if (fv.length) {
        rankedLists.push(fv.map((r) => r.memoryId));
        weights.push(vw);
      }
    }

    const byId = new Map<string, SearchHit>();
    for (const r of lexicalMapped) byId.set(r.memoryId, r);
    for (const r of textVector) byId.set(r.memoryId, r);
    for (const fv of fileVectorsResults) {
      for (const r of fv) byId.set(r.memoryId, r);
    }

    const [nodeCount, edgeCount] = await Promise.all([
      graph.stats.nodeCount(ctx, { label: "memoryRecord" }),
      graph.stats.edgeCount(ctx, { label: "SIMILAR_TO" }),
    ]);
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 1;
    const adaptiveGraphWeight =
      args.graphWeight ?? Math.max(0, 0.5 * (1 - density));

    if (adaptiveGraphWeight > 0) {
      const GRAPH_SEED_COUNT = 5;
      const GRAPH_NEIGHBORS_PER_SEED = 15;
      const allIds = new Set(byId.keys());
      const seeds = [...byId.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, GRAPH_SEED_COUNT);
      const graphScored: Array<{ id: string; weight: number }> = [];
      const seen = new Set(seeds.map((s) => s.memoryId));
      for (const seed of seeds) {
        const { page } = await graph.edges.neighbors(ctx, {
          label: "SIMILAR_TO",
          node: seed.memoryId,
          paginationOpts: { cursor: null, numItems: GRAPH_NEIGHBORS_PER_SEED },
        });
        for (const edge of page) {
          const nId =
            edge.from === seed.memoryId ? edge.to : edge.from;
          if (!allIds.has(nId) || seen.has(nId)) continue;
          seen.add(nId);
          const edgeScore = edge.properties?.score ?? 0;
          graphScored.push({ id: nId, weight: edgeScore });
        }
      }
      graphScored.sort((a, b) => b.weight - a.weight);
      if (graphScored.length) {
        rankedLists.push(graphScored.map((g) => g.id));
        weights.push(adaptiveGraphWeight);
      }
    }

    if (rankedLists.length === 0) return [];
    if (rankedLists.length === 1) {
      const first = textVector.length
        ? textVector
        : fileVectorsResults.find((fv) => fv.length) ?? lexicalMapped;
      return mergeAndFilter(first.slice(0, limit));
    }

    const fused = fuseRrf(
      rankedLists.map((ranked, i) => ({
        armId: `arm-${i}`,
        ranked,
        weight: weights[i] ?? 1,
      })),
      { k: effectiveK },
    );

    return mergeAndFilter(
      fused
        .slice(0, limit)
        .map((row) => {
          const hit = byId.get(row.id);
          if (!hit) return null;
          return {
            memoryId: hit.memoryId,
            key: hit.key,
            title: hit.title,
            text: hit.text,
            score: row.score,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    );
  },
});
