import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { graph } from "../graph";
import { readTimeDecay } from "../internal/accessStats";
import { memoryEvents } from "../internal/events";
import { createContextRag } from "../internal/rag";
import { sourceValidator } from "../schema";
import { search as searchClient } from "../search";

function fusedRank(
  sortedResults: string[][],
  opts: { k: number; weights: number[] },
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const [i, results] of sortedResults.entries()) {
    const w = opts.weights[i] ?? 1;
    for (let j = 0; j < results.length; j++) {
      const id = results[j];
      scores.set(id, (scores.get(id) ?? 0) + w / (opts.k + j));
    }
  }
  return scores;
}

export const search = action({
  args: {
    namespace: v.string(),
    query: v.union(v.string(), v.array(v.number())),
    limit: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    rrfK: v.optional(v.number()),
    vectorWeight: v.optional(v.number()),
    lexicalWeight: v.optional(v.number()),
    graphWeight: v.optional(v.number()),
    accessWeight: v.optional(v.number()),
    /** One or more query vectors from attached files (e.g. embed-for-search cache). */
    fileEmbeddings: v.optional(v.array(v.array(v.number()))),
    apiKey: v.optional(v.string()),
    actor: v.optional(
      v.object({
        byType: v.string(),
        byId: v.string(),
      }),
    ),
    session: v.optional(v.string()),
    /** When set (e.g. chat search), stored on contextMemory events for unified timeline projection. */
    threadId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    /** When set, drop hits with `score` strictly below this (RRF / vector scale). */
    minScore: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      entryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      text: v.string(),
      importance: v.number(),
      score: v.number(),
      observationTime: v.optional(v.number()),
      source: v.optional(sourceValidator),
      textPreview: v.optional(v.string()),
    }),
  ),
  handler: async (
    ctx,
    {
      includeHistorical,
      retrievalMode,
      rrfK,
      vectorWeight,
      lexicalWeight,
      graphWeight,
      accessWeight: accessWeightArg,
      fileEmbeddings,
      apiKey,
      actor,
      session,
      threadId: threadIdArg,
      clientSessionId: clientSessionIdArg,
      minScore: minScoreArg,
      ...args
    },
  ) => {
    const accessWeight = accessWeightArg ?? 0.15;
    const fileEmbeddingsList: number[][] | undefined =
      fileEmbeddings && fileEmbeddings.length > 0 ? fileEmbeddings : undefined;
    const rag = createContextRag(apiKey);
    const mode = retrievalMode ?? "hybrid";
    const limit = args.limit ?? 10;
    const candidateLimit = Math.max(limit * 3, 20);

    type SearchHit = {
      entryId: string;
      key: string;
      title: string | undefined;
      text: string;
      importance: number;
      score: number;
      observationTime?: number;
      source?:
        | {
            kind: "document";
            sourceType: "text" | "binary";
            document: string;
            documentId: string;
            entryId: string;
            key: string;
          }
        | {
            kind: "content";
            sourceType: "text" | "binary";
            contentId: string;
          };
      textPreview?: string;
    };

    const mergeSourcesAndFilter = async (
      hits: SearchHit[],
    ): Promise<SearchHit[]> => {
      if (!hits.length) return hits;
      const rows = await ctx.runQuery(
        internal.internal.entryStore.getEntriesSourceBatch,
        {
          namespace: args.namespace,
          entryIds: hits.map((h) => h.entryId),
        },
      );
      const merged = hits.map((h, i) => {
        const row = rows[i];
        if (!row) return h;
        return {
          ...h,
          source: row.source,
          textPreview: row.textPreview,
        };
      });
      if (minScoreArg === undefined) return merged;
      return merged.filter((h) => h.score >= minScoreArg);
    };

    const finalizeResults = async (hits: SearchHit[]): Promise<SearchHit[]> => {
      const ready = await mergeSourcesAndFilter(hits);
      if (!ready.length) return [];
      const times = await ctx.runQuery(
        internal.internal.accessStats.getObservationTimes,
        { entryIds: ready.map((h) => h.entryId) },
      );
      const enriched = ready.map((h) => ({
        ...h,
        observationTime: times[h.entryId],
      }));
      const timelineMeta: Record<string, string | number | boolean | null> = {};
      if (threadIdArg) timelineMeta.threadId = threadIdArg;
      if (clientSessionIdArg) timelineMeta.sessionId = clientSessionIdArg;

      for (let i = 0; i < enriched.length; i++) {
        await memoryEvents.append.appendToStream(ctx, {
          streamType: "contextMemory",
          namespace: args.namespace,
          streamId: enriched[i].entryId,
          eventId: crypto.randomUUID(),
          eventType: "searched",
          payload: {
            namespace: args.namespace,
            rank: i,
            score: enriched[i].score,
          },
          actor,
          session,
          ...(Object.keys(timelineMeta).length > 0
            ? { metadata: timelineMeta }
            : {}),
        });
      }
      await ctx.runMutation(
        internal.internal.accessStats.scheduleAccessStatsFlush,
        {},
      );
      return enriched;
    };

    const filters = includeHistorical
      ? undefined
      : [{ name: "status" as const, value: "current" }];

    const runVectorSearch = async (
      query: string | number[],
      overrideLimit?: number,
    ): Promise<SearchHit[]> => {
      const { entries, results } = await rag.search(ctx, {
        namespace: args.namespace,
        query,
        limit: overrideLimit ?? args.limit,
        filters,
      });
      return entries.map((entry) => ({
        entryId: entry.entryId,
        key: entry.key ?? entry.entryId,
        title: entry.title,
        text: entry.text,
        importance: entry.importance,
        score: results
          .filter((r) => r.entryId === entry.entryId)
          .reduce((max, r) => Math.max(max, r.score), 0),
      }));
    };

    const isStringQuery = typeof args.query === "string";
    const hasNonEmptyTextQuery =
      isStringQuery && (args.query as string).trim().length > 0;

    // Vector-only mode: text vector + optional N file vectors, no lexical
    if (mode === "vector") {
      if (!fileEmbeddingsList?.length) {
        if (isStringQuery && !hasNonEmptyTextQuery) {
          return finalizeResults([]);
        }
        return finalizeResults(await runVectorSearch(args.query));
      }

      const textVector = hasNonEmptyTextQuery
        ? await runVectorSearch(args.query, candidateLimit)
        : [];
      const fileVectorsResults = await Promise.all(
        fileEmbeddingsList.map((emb) => runVectorSearch(emb, candidateLimit)),
      );

      const nonemptyFileVectors = fileVectorsResults.filter((fv) => fv.length);
      if (!textVector.length && !nonemptyFileVectors.length) {
        return finalizeResults([]);
      }
      if (!textVector.length && nonemptyFileVectors.length === 1) {
        return finalizeResults(nonemptyFileVectors[0].slice(0, limit));
      }
      if (textVector.length && !nonemptyFileVectors.length) {
        return finalizeResults(textVector.slice(0, limit));
      }

      const byId = new Map<string, SearchHit>();
      for (const r of textVector) byId.set(r.entryId, r);
      for (const fv of fileVectorsResults) {
        for (const r of fv) byId.set(r.entryId, r);
      }

      const effectiveK = rrfK ?? Math.max(candidateLimit, 60);
      const vecLists: string[][] = [];
      const vecWeights: number[] = [];
      const w = vectorWeight ?? 1;
      if (textVector.length) {
        vecLists.push(textVector.map((r) => r.entryId));
        vecWeights.push(w);
      }
      for (const fv of nonemptyFileVectors) {
        vecLists.push(fv.map((r) => r.entryId));
        vecWeights.push(w);
      }
      if (accessWeight > 0) {
        const candidateIds = [...byId.keys()];
        const accessStats = await ctx.runQuery(
          internal.internal.accessStats.getAccessStatsBatch,
          { entryIds: candidateIds },
        );
        const now = Date.now();
        const accessRanked = candidateIds
          .map((id) => {
            const stats = accessStats[id];
            if (!stats) return null;
            const current = readTimeDecay(
              stats.decayedScore,
              stats.lastAccessTime,
              now,
            );
            return { id, sortKey: Math.log1p(current) };
          })
          .filter((x): x is NonNullable<typeof x> => x != null && x.sortKey > 0)
          .sort((a, b) => b.sortKey - a.sortKey)
          .map((x) => x.id);
        if (accessRanked.length) {
          vecLists.push(accessRanked);
          vecWeights.push(accessWeight);
        }
      }
      const scores = fusedRank(vecLists, {
        k: effectiveK,
        weights: vecWeights,
      });
      return finalizeResults(
        [...scores.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id, s]) => {
            const hit = byId.get(id);
            if (!hit) return null;
            return { ...hit, score: s };
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      );
    }

    const lexicalQuery = hasNonEmptyTextQuery ? (args.query as string) : null;
    const lexical = lexicalQuery
      ? await searchClient.search(ctx, {
          namespace: args.namespace,
          query: lexicalQuery,
          limit: candidateLimit,
          includeHistorical,
          sourceSystem: "context",
        })
      : [];

    const lexicalMapped: SearchHit[] = lexical
      .filter(
        (
          r,
        ): r is typeof r & {
          source: { kind: "document"; entryId: string; key: string };
        } => r.source.kind === "document",
      )
      .map((r, index) => ({
        entryId: r.source.entryId,
        key: r.source.key,
        title: r.title,
        text: r.text,
        importance: 1,
        score: 1 / (index + 1),
      }));

    if (mode === "lexical") {
      return finalizeResults(lexicalMapped.slice(0, limit));
    }

    // Hybrid: text vector + lexical + N file vectors in parallel
    const textVector = await (async (): Promise<SearchHit[]> => {
      if (!fileEmbeddingsList?.length) {
        if (isStringQuery && !hasNonEmptyTextQuery) return [];
        return runVectorSearch(args.query, candidateLimit);
      }
      if (hasNonEmptyTextQuery) {
        return runVectorSearch(args.query, candidateLimit);
      }
      return [];
    })();
    const fileVectorsResults = fileEmbeddingsList?.length
      ? await Promise.all(
          fileEmbeddingsList.map((emb) => runVectorSearch(emb, candidateLimit)),
        )
      : [];

    const rankedLists: string[][] = [];
    const weights: number[] = [];
    const vw = vectorWeight ?? 1;
    if (textVector.length) {
      rankedLists.push(textVector.map((r) => r.entryId));
      weights.push(vw);
    }
    if (lexicalMapped.length) {
      rankedLists.push(lexicalMapped.map((r) => r.entryId));
      weights.push(lexicalWeight ?? 1);
    }
    for (const fv of fileVectorsResults) {
      if (fv.length) {
        rankedLists.push(fv.map((r) => r.entryId));
        weights.push(vw);
      }
    }

    const byId = new Map<string, SearchHit>();
    for (const r of lexicalMapped) byId.set(r.entryId, r);
    for (const r of textVector) byId.set(r.entryId, r);
    for (const fv of fileVectorsResults) {
      for (const r of fv) byId.set(r.entryId, r);
    }

    // Adaptive graph weight based on graph density
    const [nodeCount, edgeCount] = await Promise.all([
      graph.stats.nodeCount(ctx, { label: "contextEntry" }),
      graph.stats.edgeCount(ctx, { label: "SIMILAR_TO" }),
    ]);
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 1;
    const adaptiveGraphWeight = graphWeight ?? Math.max(0, 0.5 * (1 - density));

    // Graph neighbor boosting: top seeds' neighbors get an RRF arm
    if (adaptiveGraphWeight > 0) {
      const GRAPH_SEED_COUNT = 5;
      const GRAPH_NEIGHBORS_PER_SEED = 15;
      const allIds = new Set(byId.keys());
      const seeds = [...byId.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, GRAPH_SEED_COUNT);

      const graphScored: Array<{ id: string; weight: number }> = [];
      const seen = new Set(seeds.map((s) => s.entryId));
      for (const seed of seeds) {
        const { page } = await graph.edges.neighbors(ctx, {
          label: "SIMILAR_TO",
          node: seed.entryId,
          paginationOpts: { cursor: null, numItems: GRAPH_NEIGHBORS_PER_SEED },
        });
        for (const edge of page) {
          const nId = edge.from === seed.entryId ? edge.to : edge.from;
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

    // Access frequency arm: rank candidates by decayed access score
    if (accessWeight > 0) {
      const candidateIds = [...byId.keys()];
      const accessStats = await ctx.runQuery(
        internal.internal.accessStats.getAccessStatsBatch,
        { entryIds: candidateIds },
      );
      const now = Date.now();
      const accessRanked = candidateIds
        .map((id) => {
          const stats = accessStats[id];
          if (!stats) return null;
          const current = readTimeDecay(
            stats.decayedScore,
            stats.lastAccessTime,
            now,
          );
          return { id, sortKey: Math.log1p(current) };
        })
        .filter((x): x is NonNullable<typeof x> => x != null && x.sortKey > 0)
        .sort((a, b) => b.sortKey - a.sortKey)
        .map((x) => x.id);
      if (accessRanked.length) {
        rankedLists.push(accessRanked);
        weights.push(accessWeight);
      }
    }

    if (rankedLists.length === 0) return [];
    if (rankedLists.length === 1) {
      const firstFileHits = fileVectorsResults.find((fv) => fv.length);
      const single = textVector.length
        ? textVector
        : firstFileHits?.length
          ? firstFileHits
          : lexicalMapped;
      return finalizeResults(single.slice(0, limit));
    }

    const effectiveK = rrfK ?? Math.max(candidateLimit, 60);
    const scores = fusedRank(rankedLists, { k: effectiveK, weights });
    return finalizeResults(
      [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id, s]) => {
          const hit = byId.get(id);
          if (!hit) return null;
          return { ...hit, score: s };
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    );
  },
});
