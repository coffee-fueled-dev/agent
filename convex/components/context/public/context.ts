import type { EntryId } from "@convex-dev/rag";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { graph } from "../graph";
import { history } from "../history";
import { embedText } from "../internal/embedding";
import { memoryEvents } from "../internal/events";
import { createContextRag } from "../internal/rag";
import { sourceValidator, versionDataValidator } from "../schema";
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

const DEFAULT_SIMILARITY_K = 6;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

export const scheduleSimilarityEdges = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.public.context.createSimilarityEdgesAsync,
      args,
    );
  },
});

export const createSimilarityEdgesAsync = internalAction({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    const k = args.similarityK ?? DEFAULT_SIMILARITY_K;
    const threshold = args.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

    const { entries, results } = await rag.search(ctx, {
      namespace: args.namespace,
      query: args.embedding,
      limit: k + 1,
      filters: [{ name: "status", value: "current" }],
    });

    for (const entry of entries) {
      if (entry.entryId === args.entryId) continue;
      const score = results
        .filter((r) => r.entryId === entry.entryId)
        .reduce((max, r) => Math.max(max, r.score), 0);
      if (score < threshold) continue;
      await graph.edges.create(ctx, {
        label: "SIMILAR_TO",
        from: args.entryId,
        to: entry.entryId,
        properties: { score },
      });
    }
  },
});

const TEXT_PREVIEW_LENGTH = 280;

function featureId(entryId: string) {
  return `context:entry:${entryId}`;
}

export const getObservationTimes = internalQuery({
  args: { entryIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const entryId of args.entryIds) {
      const entry = await ctx.db
        .query("contextEntries")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (entry?.observationTime) result[entryId] = entry.observationTime;
    }
    return result;
  },
});

const searchResultValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  text: v.string(),
  importance: v.number(),
  score: v.number(),
  observationTime: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

const versionChainEntryValidator = v.object({
  entryId: v.string(),
  kind: v.string(),
  entryTime: v.number(),
  payload: v.optional(v.any()),
});

const contextDetailValidator = v.union(
  v.null(),
  v.object({
    namespace: v.string(),
    entryId: v.string(),
    key: v.string(),
    source: sourceValidator,
    title: v.optional(v.string()),
    textPreview: v.string(),
    legacyEntryId: v.optional(v.string()),
    observationTime: v.optional(v.number()),
    fullText: v.string(),
    version: v.union(
      v.null(),
      v.object({ key: v.string(), data: versionDataValidator }),
    ),
    versionChain: v.array(versionChainEntryValidator),
  }),
);

export const add = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    chunks: v.optional(
      v.array(v.object({ text: v.string(), embedding: v.array(v.number()) })),
    ),
    source: v.optional(sourceValidator),
    sourceType: v.optional(v.union(v.literal("text"), v.literal("binary"))),
    searchText: v.optional(v.string()),
    observationTime: v.optional(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  returns: v.object({ entryId: v.string() }),
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    const embedding =
      args.chunks?.[0]?.embedding ?? (await embedText(args.text, args.apiKey));

    const result = await rag.add(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      chunks: args.chunks ?? [{ text: args.text, embedding }],
      filterValues: [{ name: "status", value: "current" }],
    });

    const source: typeof args.source & {} = args.source ?? {
      kind: "document",
      sourceType: args.sourceType ?? "text",
      document: "contextEntries",
      documentId: result.entryId,
      entryId: result.entryId,
      key: args.key,
    };

    await ctx.runMutation(api.public.add.insertEntry, {
      namespace: args.namespace,
      entryId: result.entryId,
      key: args.key,
      source,
      title: args.title,
      textPreview: args.text.slice(0, TEXT_PREVIEW_LENGTH),
      observationTime: args.observationTime,
    });

    await ctx.runMutation(internal.internal.versionStore.insert, {
      entryId: result.entryId,
      namespace: args.namespace,
      key: args.key,
    });

    await history.append(ctx, {
      streamType: "contextEntry",
      streamId: args.key,
      entryId: result.entryId,
      kind: "created",
      payload: {
        title: args.title,
        textPreview: args.text.slice(0, TEXT_PREVIEW_LENGTH),
      },
    });

    await searchClient.upsertFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(result.entryId),
      sourceSystem: "context",
      source,
      title: args.title,
      text: args.searchText ?? args.text,
      status: "current",
    });

    await ctx.runMutation(internal.internal.embeddingStore.insert, {
      entryId: result.entryId,
      namespace: args.namespace,
      embedding,
    });

    await ctx.runMutation(api.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(api.public.community.markCommunitiesStale, {
      namespace: args.namespace,
    });

    await graph.nodes.create(ctx, {
      label: "contextEntry",
      key: result.entryId,
    });

    await ctx.runMutation(internal.public.context.scheduleSimilarityEdges, {
      entryId: result.entryId,
      namespace: args.namespace,
      embedding,
      apiKey: args.apiKey,
      similarityK: args.similarityK,
      similarityThreshold: args.similarityThreshold,
    });

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      streamId: result.entryId,
      eventId: crypto.randomUUID(),
      eventType: "added",
      payload: { namespace: args.namespace, key: args.key },
    });

    return { entryId: result.entryId };
  },
});

export const get = query({
  args: { namespace: v.string(), entryId: v.string() },
  returns: contextDetailValidator,
  handler: async (ctx, args) => {
    let entry = await ctx.db
      .query("contextEntries")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .filter((q) => q.eq(q.field("entryId"), args.entryId))
      .first();

    if (!entry) {
      entry = await ctx.db
        .query("contextEntries")
        .withIndex("by_legacyEntryId", (q) =>
          q.eq("legacyEntryId", args.entryId),
        )
        .first();
      if (entry && entry.namespace !== args.namespace) entry = null;
    }

    if (!entry) return null;

    const rag = createContextRag();
    const chunks = await rag.listChunks(ctx, {
      entryId: entry.entryId as EntryId,
      paginationOpts: { cursor: null, numItems: 1000 },
    });

    const version = await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
      .first();

    const chain = version
      ? await history.getPathToRoot(ctx, {
          streamType: "contextEntry",
          streamId: version.key,
          entryId: entry.legacyEntryId ?? entry.entryId,
        })
      : [];

    return {
      namespace: entry.namespace,
      entryId: entry.entryId,
      key: entry.key,
      source: entry.source,
      title: entry.title,
      textPreview: entry.textPreview,
      legacyEntryId: entry.legacyEntryId,
      observationTime: entry.observationTime,
      fullText: chunks.page.map((c) => c.text).join("\n"),
      version: version ? { key: version.key, data: version.data } : null,
      versionChain: chain.map((e) => ({
        entryId: e.entryId,
        kind: e.kind,
        entryTime: e.entryTime,
        payload: e.payload,
      })),
    };
  },
});

export const recordView = mutation({
  args: { namespace: v.string(), entryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      streamId: args.entryId,
      eventId: crypto.randomUUID(),
      eventType: "viewed",
      payload: { namespace: args.namespace },
    });
  },
});

export const remove = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    await rag.delete(ctx, { entryId: args.entryId as EntryId });
    await ctx.runMutation(api.public.add.deleteEntry, args);
    await searchClient.deleteFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(args.entryId),
    });
    await ctx.runMutation(internal.internal.embeddingStore.remove, {
      entryId: args.entryId,
    });
    await ctx.runMutation(api.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(api.public.community.markCommunitiesStale, {
      namespace: args.namespace,
    });
    await graph.nodes.delete(ctx, {
      label: "contextEntry",
      key: args.entryId,
    });

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      streamId: args.entryId,
      eventId: crypto.randomUUID(),
      eventType: "deleted",
      payload: { namespace: args.namespace },
    });
  },
});

export const edit = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    observationTime: v.optional(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  returns: v.object({ entryId: v.string() }),
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    const oldEntry = await rag.getEntry(ctx, {
      entryId: args.entryId as EntryId,
    });
    const key = oldEntry?.key ?? args.entryId;
    const oldChunks = await rag.listChunks(ctx, {
      entryId: args.entryId as EntryId,
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    const oldText = oldChunks.page.map((c) => c.text).join("\n");
    const oldEmbedding = await ctx.runQuery(
      internal.internal.embeddingStore.get,
      {
        entryId: args.entryId,
      },
    );
    await rag.delete(ctx, { entryId: args.entryId as EntryId });

    const historicalSource = {
      kind: "document" as const,
      sourceType: "text" as const,
      document: "contextEntries",
      documentId: args.entryId,
      entryId: args.entryId,
      key,
    };

    const historical = await rag.add(ctx, {
      namespace: args.namespace,
      key,
      title: oldEntry?.title,
      chunks: oldEmbedding
        ? [{ text: oldText, embedding: oldEmbedding }]
        : [oldText],
      filterValues: [{ name: "status", value: "historical" }],
    });
    await ctx.runMutation(api.public.add.insertEntry, {
      namespace: args.namespace,
      entryId: historical.entryId,
      key,
      source: historicalSource,
      title: oldEntry?.title,
      textPreview: oldText.slice(0, TEXT_PREVIEW_LENGTH),
      legacyEntryId: args.entryId,
    });

    const embedding = await embedText(args.text, args.apiKey);

    const currentSource = {
      kind: "document" as const,
      sourceType: "text" as const,
      document: "contextEntries",
      documentId: args.entryId,
      entryId: args.entryId,
      key,
    };

    const current = await rag.add(ctx, {
      namespace: args.namespace,
      key,
      title: args.title,
      chunks: [{ text: args.text, embedding }],
      filterValues: [{ name: "status", value: "current" }],
    });
    await ctx.runMutation(api.public.add.insertEntry, {
      namespace: args.namespace,
      entryId: current.entryId,
      key,
      source: currentSource,
      title: args.title,
      textPreview: args.text.slice(0, TEXT_PREVIEW_LENGTH),
      observationTime: args.observationTime,
    });

    await ctx.runMutation(internal.internal.versionStore.markHistorical, {
      entryId: args.entryId,
      replacedByEntryId: current.entryId,
      historicalEntryId: historical.entryId,
    });
    await ctx.runMutation(internal.internal.versionStore.insert, {
      entryId: current.entryId,
      namespace: args.namespace,
      key,
    });
    await ctx.runMutation(internal.internal.embeddingStore.updateEntryId, {
      oldEntryId: args.entryId,
      newEntryId: historical.entryId,
    });
    await ctx.runMutation(internal.internal.embeddingStore.insert, {
      entryId: current.entryId,
      namespace: args.namespace,
      embedding,
    });
    await ctx.runMutation(api.public.add.deleteEntry, {
      namespace: args.namespace,
      entryId: args.entryId,
    });

    await searchClient.deleteFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(args.entryId),
    });
    await searchClient.upsertFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(historical.entryId),
      sourceSystem: "context",
      source: historicalSource,
      title: oldEntry?.title,
      text: oldText,
      status: "historical",
    });
    await searchClient.upsertFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(current.entryId),
      sourceSystem: "context",
      source: currentSource,
      title: args.title,
      text: args.text,
      status: "current",
    });

    const heads = await history.listHeads(ctx, {
      streamType: "contextEntry",
      streamId: key,
    });
    await history.append(ctx, {
      streamType: "contextEntry",
      streamId: key,
      entryId: current.entryId,
      kind: "edited",
      parentEntryIds:
        heads.length > 0 ? heads.map((h) => h.entryId) : undefined,
      payload: {
        title: args.title,
        textPreview: args.text.slice(0, TEXT_PREVIEW_LENGTH),
      },
    });

    await ctx.runMutation(api.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(api.public.community.markCommunitiesStale, {
      namespace: args.namespace,
    });

    // Delete old entry's graph node (cascades similarity edges)
    await graph.nodes.delete(ctx, {
      label: "contextEntry",
      key: args.entryId,
    });

    await graph.nodes.create(ctx, {
      label: "contextEntry",
      key: current.entryId,
    });

    await ctx.runMutation(internal.public.context.scheduleSimilarityEdges, {
      entryId: current.entryId,
      namespace: args.namespace,
      embedding,
      apiKey: args.apiKey,
      similarityK: args.similarityK,
      similarityThreshold: args.similarityThreshold,
    });

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      streamId: current.entryId,
      eventId: crypto.randomUUID(),
      eventType: "edited",
      payload: { namespace: args.namespace, oldEntryId: args.entryId },
    });

    return { entryId: current.entryId };
  },
});

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
    fileEmbedding: v.optional(v.array(v.number())),
    apiKey: v.optional(v.string()),
  },
  returns: v.array(searchResultValidator),
  handler: async (
    ctx,
    {
      includeHistorical,
      retrievalMode,
      rrfK,
      vectorWeight,
      lexicalWeight,
      graphWeight,
      fileEmbedding,
      apiKey,
      ...args
    },
  ) => {
    const rag = createContextRag(apiKey);
    const mode = retrievalMode ?? "hybrid";
    const limit = args.limit ?? 10;
    const candidateLimit = Math.max(limit * 3, 20);

    const finalizeResults = async (
      hits: SearchHit[],
    ): Promise<SearchHit[]> => {
      if (!hits.length) return hits;
      const times = (await ctx.runQuery(
        internal.public.context.getObservationTimes,
        { entryIds: hits.map((h) => h.entryId) },
      )) as Record<string, number>;
      const enriched = hits.map((h) => ({
        ...h,
        observationTime: times[h.entryId],
      }));
      for (let i = 0; i < enriched.length; i++) {
        await memoryEvents.append.appendToStream(ctx, {
          streamType: "contextMemory",
          streamId: enriched[i].entryId,
          eventId: crypto.randomUUID(),
          eventType: "searched",
          payload: {
            namespace: args.namespace,
            rank: i,
            score: enriched[i].score,
          },
        });
      }
      return enriched;
    };

    const filters = includeHistorical
      ? undefined
      : [{ name: "status" as const, value: "current" }];

    type SearchHit = {
      entryId: string;
      key: string;
      title: string | undefined;
      text: string;
      importance: number;
      score: number;
      observationTime?: number;
      metadata?: unknown;
    };

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
        metadata: entry.metadata,
      }));
    };

    const hasTextQuery = typeof args.query === "string";

    // Vector-only mode: run text vector + optional file vector, no lexical
    if (mode === "vector") {
      if (!fileEmbedding)
        return finalizeResults(await runVectorSearch(args.query));
      const [textVector, fileVector] = await Promise.all([
        hasTextQuery
          ? runVectorSearch(args.query, candidateLimit)
          : Promise.resolve([]),
        runVectorSearch(fileEmbedding, candidateLimit),
      ]);
      if (!textVector.length)
        return finalizeResults(fileVector.slice(0, limit));
      if (!fileVector.length)
        return finalizeResults(textVector.slice(0, limit));
      const byId = new Map<string, SearchHit>();
      for (const r of fileVector) byId.set(r.entryId, r);
      for (const r of textVector) byId.set(r.entryId, r);
      const effectiveK = rrfK ?? Math.max(candidateLimit, 60);
      const scores = fusedRank(
        [textVector.map((r) => r.entryId), fileVector.map((r) => r.entryId)],
        { k: effectiveK, weights: [vectorWeight ?? 1, vectorWeight ?? 1] },
      );
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

    const lexicalQuery = hasTextQuery ? (args.query as string) : null;
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

    // Hybrid: run all available arms in parallel
    const [textVector, fileVector] = await Promise.all([
      hasTextQuery || !fileEmbedding
        ? runVectorSearch(args.query, candidateLimit)
        : Promise.resolve([]),
      fileEmbedding
        ? runVectorSearch(fileEmbedding, candidateLimit)
        : Promise.resolve([]),
    ]);

    const rankedLists: string[][] = [];
    const weights: number[] = [];
    if (textVector.length) {
      rankedLists.push(textVector.map((r) => r.entryId));
      weights.push(vectorWeight ?? 1);
    }
    if (lexicalMapped.length) {
      rankedLists.push(lexicalMapped.map((r) => r.entryId));
      weights.push(lexicalWeight ?? 1);
    }
    if (fileVector.length) {
      rankedLists.push(fileVector.map((r) => r.entryId));
      weights.push(vectorWeight ?? 1);
    }

    const byId = new Map<string, SearchHit>();
    for (const r of lexicalMapped) byId.set(r.entryId, r);
    for (const r of fileVector) byId.set(r.entryId, r);
    for (const r of textVector) byId.set(r.entryId, r);

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
          const edgeScore =
            (edge.properties as { score?: number } | undefined)?.score ?? 0;
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
      const single = textVector.length
        ? textVector
        : fileVector.length
          ? fileVector
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
