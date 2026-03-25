import { type EntryId, hybridRank } from "@convex-dev/rag";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { action, query } from "../_generated/server";
import { ContextClient } from "../components/context/client";
import { createContextRag } from "../components/context/internal/rag";
import { embedText } from "./embedding";

function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

function getSearchFeatureId(entryId: string) {
  return `context:entry:${entryId}`;
}

export const addContext = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    metadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null()),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const client = createContextClient();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const embedding = await embedText(args.text, apiKey);
    const result = await client.add(ctx, {
      ...args,
      chunks: [{ text: args.text, embedding }],
      filterValues: [{ name: "status", value: "current" }],
    });
    await ctx.runMutation(internal.context.embedding.insertEmbedding, {
      entryId: result.entryId,
      namespace: args.namespace,
      embedding,
    });
    await ctx.runMutation(internal.context.versionStore.insertVersion, {
      entryId: result.entryId,
      namespace: args.namespace,
      key: args.key,
    });
    await client.appendHistory(ctx, {
      streamId: args.key,
      entryId: result.entryId,
      kind: "created",
      payload: { title: args.title, textPreview: args.text.slice(0, 280) },
    });
    await client.upsertSearchFeature(ctx, {
      namespace: args.namespace,
      featureId: getSearchFeatureId(result.entryId),
      sourceSystem: "context",
      source: {
        kind: "document",
        document: "contextEntries",
        documentId: result.entryId,
        entryId: result.entryId,
        key: args.key,
        sourceType: "text",
      },
      title: args.title,
      text: args.text,
      status: "current",
    });
    await ctx.runMutation(internal.context.embedding.markProjectionsStale, {
      namespace: args.namespace,
    });
    return result;
  },
});

export const listContext = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await createContextClient().list(ctx, args);
  },
});

export const listContextWithFiles = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await createContextClient().list(ctx, args);
    const enriched = await Promise.all(
      result.page.map(async (entry: (typeof result.page)[number]) => {
        const file = await ctx.db
          .query("contextFiles")
          .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
          .first();
        if (!file) return { ...entry, file: undefined };
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...entry,
          file: {
            storageId: file.storageId,
            mimeType: file.mimeType,
            fileName: file.fileName,
            url,
          },
        };
      }),
    );
    return { ...result, page: enriched };
  },
});

export const getContextFile = query({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (!file) return null;
    const url = await ctx.storage.getUrl(file.storageId);
    return { mimeType: file.mimeType, fileName: file.fileName, url };
  },
});

export const getContextDetail = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const client = createContextClient();
    type ContextEntry = Awaited<
      ReturnType<ContextClient["list"]>
    >["page"][number];
    let cursor: string | null = null;
    let entry: ContextEntry | null = null;

    for (let i = 0; i < 20; i++) {
      const page = await client.list(ctx, {
        namespace: args.namespace,
        paginationOpts: {
          cursor,
          numItems: 100,
        },
      });
      entry =
        page.page.find((item: ContextEntry) => item.entryId === args.entryId) ??
        null;
      if (entry || page.isDone) break;
      cursor = page.continueCursor;
    }

    if (!entry) {
      const legacy = await client.getEntryByLegacyId(ctx, {
        namespace: args.namespace,
        legacyEntryId: args.entryId,
      });
      if (legacy) entry = legacy;
    }
    if (!entry) return null;

    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
      .first();
    const url = file ? await ctx.storage.getUrl(file.storageId) : null;

    const rag = createContextRag();
    const chunks = await rag.listChunks(ctx, {
      entryId: entry.entryId as EntryId,
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    const fullText = chunks.page.map((c) => c.text).join("\n");

    const version = await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
      .first();

    let versionChain: Array<{
      entryId: string;
      kind: string;
      entryTime: number;
      payload?: unknown;
    }> = [];
    if (version) {
      const historyEntryId = entry.legacyEntryId ?? entry.entryId;
      const chain = await client.getVersionChain(ctx, {
        streamId: version.key,
        entryId: historyEntryId,
      });
      versionChain = chain.map(
        (e: {
          entryId: string;
          kind: string;
          entryTime: number;
          payload?: unknown;
        }) => ({
          entryId: e.entryId,
          kind: e.kind,
          entryTime: e.entryTime,
          payload: e.payload,
        }),
      );
    }

    return {
      ...entry,
      fullText,
      file: file
        ? {
            storageId: file.storageId,
            mimeType: file.mimeType,
            fileName: file.fileName,
            url,
          }
        : null,
      version: version
        ? {
            key: version.key,
            data: version.data,
            createdAt: version.createdAt,
          }
        : null,
      versionChain,
    };
  },
});

export const deleteContext = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const client = createContextClient();
    const rag = createContextRag(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    await rag.delete(ctx, { entryId: args.entryId as EntryId });
    await ctx.runMutation(components.context.public.add.deleteEntry, {
      namespace: args.namespace,
      entryId: args.entryId,
    });
    await ctx.runMutation(internal.context.embedding.deleteEmbedding, {
      entryId: args.entryId,
    });
    await ctx.runMutation(internal.context.fileStore.deleteContextFile, {
      entryId: args.entryId,
    });
    await client.deleteSearchFeature(ctx, {
      namespace: args.namespace,
      featureId: getSearchFeatureId(args.entryId),
    });
    await ctx.runMutation(internal.context.embedding.markProjectionsStale, {
      namespace: args.namespace,
    });
  },
});

export const editContext = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const client = createContextClient();
    const rag = createContextRag(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    // 1. Fetch old entry data
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
      internal.context.embedding.getEmbedding,
      { entryId: args.entryId },
    );

    // 2. Delete old RAG entry
    await rag.delete(ctx, { entryId: args.entryId as EntryId });

    // 3. Re-add old content as historical (reuses existing embedding)
    const historicalResult = await client.add(ctx, {
      namespace: args.namespace,
      key,
      title: oldEntry?.title,
      text: oldText,
      chunks: oldEmbedding
        ? [{ text: oldText, embedding: oldEmbedding }]
        : undefined,
      filterValues: [{ name: "status", value: "historical" }],
      legacyEntryId: args.entryId,
    });

    // 4. Add new content as current
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const newEmbedding = await embedText(args.text, apiKey);
    const newResult = await client.add(ctx, {
      namespace: args.namespace,
      key,
      title: args.title,
      text: args.text,
      chunks: [{ text: args.text, embedding: newEmbedding }],
      filterValues: [{ name: "status", value: "current" }],
    });
    await client.upsertSearchFeature(ctx, {
      namespace: args.namespace,
      featureId: getSearchFeatureId(historicalResult.entryId),
      sourceSystem: "context",
      source: {
        kind: "document",
        document: "contextEntries",
        documentId: historicalResult.entryId,
        entryId: historicalResult.entryId,
        key,
        sourceType: "text",
      },
      title: oldEntry?.title,
      text: oldText,
      status: "historical",
    });
    await client.upsertSearchFeature(ctx, {
      namespace: args.namespace,
      featureId: getSearchFeatureId(newResult.entryId),
      sourceSystem: "context",
      source: {
        kind: "document",
        document: "contextEntries",
        documentId: newResult.entryId,
        entryId: newResult.entryId,
        key,
        sourceType: "text",
      },
      title: args.title,
      text: args.text,
      status: "current",
    });
    await client.deleteSearchFeature(ctx, {
      namespace: args.namespace,
      featureId: getSearchFeatureId(args.entryId),
    });

    // 5. Update version records
    await ctx.runMutation(internal.context.versionStore.markHistorical, {
      entryId: args.entryId,
      replacedByEntryId: newResult.entryId,
      historicalEntryId: historicalResult.entryId,
    });
    await ctx.runMutation(internal.context.versionStore.insertVersion, {
      entryId: newResult.entryId,
      namespace: args.namespace,
      key,
    });

    // 7. Update embeddings: reassign old to historical, insert new
    await ctx.runMutation(internal.context.embedding.updateEmbeddingEntryId, {
      oldEntryId: args.entryId,
      newEntryId: historicalResult.entryId,
    });
    await ctx.runMutation(internal.context.embedding.insertEmbedding, {
      entryId: newResult.entryId,
      namespace: args.namespace,
      embedding: newEmbedding,
    });

    // 8. Append history (use current stream heads as parents)
    const heads = await client.listHistoryHeads(ctx, { streamId: key });
    await client.appendHistory(ctx, {
      streamId: key,
      entryId: newResult.entryId,
      kind: "edited",
      parentEntryIds:
        heads.length > 0
          ? heads.map((h: { entryId: string }) => h.entryId)
          : undefined,
      payload: { title: args.title, textPreview: args.text.slice(0, 280) },
    });

    // 9. Delete old component contextEntries record (new ones created by client.add)
    await ctx.runMutation(components.context.public.add.deleteEntry, {
      namespace: args.namespace,
      entryId: args.entryId,
    });

    // 10. Reassign file to new entry
    await ctx.runMutation(internal.context.fileStore.updateContextFileEntryId, {
      oldEntryId: args.entryId,
      newEntryId: newResult.entryId,
    });

    // 11. Mark projections stale
    await ctx.runMutation(internal.context.embedding.markProjectionsStale, {
      namespace: args.namespace,
    });

    return { entryId: newResult.entryId };
  },
});

export const searchContext = action({
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
  },
  handler: async (
    ctx,
    {
      includeHistorical,
      retrievalMode,
      rrfK,
      vectorWeight,
      lexicalWeight,
      ...args
    },
  ) => {
    const mode = retrievalMode ?? "hybrid";
    const limit = args.limit ?? 10;
    const candidateLimit = Math.max(limit * 3, 20);
    const filters = includeHistorical
      ? undefined
      : [{ name: "status" as const, value: "current" }];
    const client = createContextClient();

    if (mode === "vector") {
      return await client.search(ctx, {
        ...args,
        filters,
      });
    }

    const lexicalQuery = typeof args.query === "string" ? args.query : null;
    const lexicalEnabled = lexicalQuery !== null;
    const lexicalResults = lexicalEnabled
      ? await client.searchFeatures(ctx, {
          namespace: args.namespace,
          query: lexicalQuery,
          limit: candidateLimit,
          includeHistorical,
          sourceSystem: "context",
        })
      : [];
    const lexicalMapped = lexicalResults
      .filter(
        (
          result,
        ): result is (typeof lexicalResults)[number] & {
          source: {
            kind: "document";
            document: string;
            documentId: string;
            entryId: string;
            key: string;
            sourceType: "text" | "binary";
          };
        } => result.source.kind === "document",
      )
      .map((result, index) => ({
        entryId: result.source.entryId,
        key: result.source.key,
        title: result.title,
        text: result.text,
        importance: 1,
        score: 1 / (index + 1),
      }));

    if (mode === "lexical" || !lexicalEnabled) {
      if (!lexicalEnabled) {
        return await client.search(ctx, {
          ...args,
          filters,
        });
      }
      return lexicalMapped.slice(0, limit);
    }

    const vectorResults = await client.search(ctx, {
      ...args,
      limit: candidateLimit,
      filters,
    });
    const fusedIds = hybridRank(
      [
        vectorResults.map((result) => result.entryId),
        lexicalMapped.map((result) => result.entryId),
      ],
      {
        k: rrfK ?? 10,
        weights: [vectorWeight ?? 1, lexicalWeight ?? 1],
      },
    );
    const byEntryId = new Map<
      string,
      (typeof vectorResults)[number] | (typeof lexicalMapped)[number]
    >();
    for (const result of lexicalMapped) byEntryId.set(result.entryId, result);
    for (const result of vectorResults) byEntryId.set(result.entryId, result);
    return fusedIds
      .map((entryId) => byEntryId.get(entryId))
      .filter((result) => !!result)
      .slice(0, limit);
  },
});
