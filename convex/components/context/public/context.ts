import { type EntryId, hybridRank } from "@convex-dev/rag";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action, query } from "../_generated/server";
import { history } from "../history";
import { embedText } from "../internal/embedding";
import { createContextRag } from "../internal/rag";
import { search as searchClient } from "../search";
import { sourceValidator, versionDataValidator } from "../schema";

const TEXT_PREVIEW_LENGTH = 280;

function featureId(entryId: string) {
  return `context:entry:${entryId}`;
}

const searchResultValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  text: v.string(),
  importance: v.number(),
  score: v.number(),
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
    apiKey: v.optional(v.string()),
  },
  returns: v.object({ entryId: v.string() }),
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    const embedding =
      args.chunks?.[0]?.embedding ??
      (await embedText(args.text, args.apiKey));

    const result = await rag.add(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      chunks: args.chunks ?? [{ text: args.text, embedding }],
      filterValues: [{ name: "status", value: "current" }],
    });

    const source: typeof args.source & {} =
      args.source ?? {
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

export const remove = action({
  args: { namespace: v.string(), entryId: v.string(), apiKey: v.optional(v.string()) },
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
  },
});

export const edit = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    apiKey: v.optional(v.string()),
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
    const oldEmbedding = await ctx.runQuery(internal.internal.embeddingStore.get, {
      entryId: args.entryId,
    });
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

    return { entryId: current.entryId };
  },
});

export const search = action({
  args: {
    namespace: v.string(),
    query: v.union(v.string(), v.array(v.number())),
    limit: v.optional(v.number()),
    searchType: v.optional(
      v.union(v.literal("vector"), v.literal("text"), v.literal("hybrid")),
    ),
    vectorScoreThreshold: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    rrfK: v.optional(v.number()),
    vectorWeight: v.optional(v.number()),
    lexicalWeight: v.optional(v.number()),
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
      apiKey,
      ...args
    },
  ) => {
    const rag = createContextRag(apiKey);
    const mode = retrievalMode ?? "hybrid";
    const limit = args.limit ?? 10;
    const candidateLimit = Math.max(limit * 3, 20);
    const filters = includeHistorical
      ? undefined
      : [{ name: "status" as const, value: "current" }];

    const vectorSearch = async (overrideLimit?: number) => {
      const { entries, results } = await rag.search(ctx, {
        ...args,
        limit: overrideLimit,
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

    if (mode === "vector") return vectorSearch();

    const lexicalQuery = typeof args.query === "string" ? args.query : null;
    const lexical = lexicalQuery
      ? await searchClient.search(ctx, {
          namespace: args.namespace,
          query: lexicalQuery,
          limit: candidateLimit,
          includeHistorical,
          sourceSystem: "context",
        })
      : [];

    const lexicalMapped = lexical
      .filter(
        (r): r is typeof r & { source: { kind: "document"; entryId: string; key: string } } =>
          r.source.kind === "document",
      )
      .map((r, index) => ({
        entryId: r.source.entryId,
        key: r.source.key,
        title: r.title,
        text: r.text,
        importance: 1,
        score: 1 / (index + 1),
      }));

    if (mode === "lexical" || !lexicalQuery) {
      if (!lexicalQuery) return vectorSearch();
      return lexicalMapped.slice(0, limit);
    }

    const vector = await vectorSearch(candidateLimit);
    const fused = hybridRank(
      [vector.map((r) => r.entryId), lexicalMapped.map((r) => r.entryId)],
      { k: rrfK ?? 10, weights: [vectorWeight ?? 1, lexicalWeight ?? 1] },
    );
    const byId = new Map<
      string,
      (typeof vector)[number] | (typeof lexicalMapped)[number]
    >();
    for (const r of lexicalMapped) byId.set(r.entryId, r);
    for (const r of vector) byId.set(r.entryId, r);
    return fused
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, limit);
  },
});
