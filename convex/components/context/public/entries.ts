import type { EntryId } from "@convex-dev/rag";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, mutation, query } from "../_generated/server";
import { memoryEvents } from "../events";
import { graph } from "../graph";
import { history } from "../history";
import { readTimeDecay } from "../internal/accessStats";
import { embedText } from "../internal/embedding";
import { createContextRag } from "../rag";
import { sourceValidator, versionDataValidator } from "../schema";
import { search as searchClient } from "../search";

const TEXT_PREVIEW_LENGTH = 280;

function featureId(entryId: string) {
  return `context:entry:${entryId}`;
}

export const getAccessStatsBatch = query({
  args: { entryIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const [searchMetrics, viewMetrics] = await Promise.all([
      memoryEvents.metrics.getBatch(ctx, {
        name: "searchCount",
        groupKeys: args.entryIds,
      }),
      memoryEvents.metrics.getBatch(ctx, {
        name: "viewCount",
        groupKeys: args.entryIds,
      }),
    ]);

    const now = Date.now();
    const result: Record<
      string,
      { decayedScore: number; totalAccesses: number; lastAccessTime: number }
    > = {};
    for (const entryId of args.entryIds) {
      const search = searchMetrics[entryId];
      const view = viewMetrics[entryId];
      const searchCount = search?.count ?? 0;
      const viewCount = view?.count ?? 0;
      const totalAccesses = searchCount + viewCount;
      if (totalAccesses === 0) continue;

      const lastAccessTime = Math.max(
        search?.lastEventTime ?? 0,
        view?.lastEventTime ?? 0,
      );
      result[entryId] = {
        decayedScore: readTimeDecay(totalAccesses, lastAccessTime, now),
        totalAccesses,
        lastAccessTime,
      };
    }
    return result;
  },
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

const eventActorArgs = v.optional(
  v.object({
    byType: v.string(),
    byId: v.string(),
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
    actor: eventActorArgs,
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
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

    await ctx.runMutation(internal.internal.entryStore.insertEntry, {
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

    await ctx.runMutation(internal.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(internal.public.community.markCommunitiesStale, {
      namespace: args.namespace,
    });

    await graph.nodes.create(ctx, {
      label: "contextEntry",
      key: result.entryId,
    });

    await ctx.runMutation(
      internal.internal.similarity.scheduleSimilarityEdges,
      {
        entryId: result.entryId,
        namespace: args.namespace,
        embedding,
        apiKey: args.apiKey,
        similarityK: args.similarityK,
        similarityThreshold: args.similarityThreshold,
      },
    );

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      namespace: args.namespace,
      streamId: result.entryId,
      eventId: crypto.randomUUID(),
      eventType: "added",
      payload: { namespace: args.namespace, key: args.key },
      ...(args.actor ? { actor: args.actor } : {}),
      ...(args.session ? { session: args.session } : {}),
      ...(args.threadId ? { metadata: { threadId: args.threadId } } : {}),
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

function viewEventIdFromKey(
  namespace: string,
  entryId: string,
  idempotencyKey: string,
) {
  return `view:${idempotencyKey}:${namespace}:${entryId}`;
}

export const recordView = mutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    actor: eventActorArgs,
    session: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const eventId =
      args.idempotencyKey !== undefined
        ? viewEventIdFromKey(args.namespace, args.entryId, args.idempotencyKey)
        : crypto.randomUUID();
    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      namespace: args.namespace,
      streamId: args.entryId,
      eventId,
      eventType: "viewed",
      payload: { namespace: args.namespace },
      actor: args.actor,
      session: args.session,
    });
  },
});

export const remove = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    apiKey: v.optional(v.string()),
    actor: eventActorArgs,
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    await rag.delete(ctx, { entryId: args.entryId as EntryId });
    await ctx.runMutation(internal.internal.entryStore.deleteEntry, args);
    await searchClient.deleteFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(args.entryId),
    });
    await ctx.runMutation(internal.internal.embeddingStore.remove, {
      entryId: args.entryId,
    });
    await ctx.runMutation(internal.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(internal.public.community.markCommunitiesStale, {
      namespace: args.namespace,
    });
    await graph.nodes.delete(ctx, {
      label: "contextEntry",
      key: args.entryId,
    });

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      namespace: args.namespace,
      streamId: args.entryId,
      eventId: crypto.randomUUID(),
      eventType: "deleted",
      payload: { namespace: args.namespace },
      ...(args.actor ? { actor: args.actor } : {}),
      ...(args.session ? { session: args.session } : {}),
      ...(args.threadId ? { metadata: { threadId: args.threadId } } : {}),
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
    actor: eventActorArgs,
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
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
    await ctx.runMutation(internal.internal.entryStore.insertEntry, {
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
    await ctx.runMutation(internal.internal.entryStore.insertEntry, {
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
    await ctx.runMutation(internal.internal.entryStore.deleteEntry, {
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

    await ctx.runMutation(internal.public.projection.markProjectionsStale, {
      namespace: args.namespace,
    });
    await ctx.runMutation(internal.public.community.markCommunitiesStale, {
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

    await ctx.runMutation(
      internal.internal.similarity.scheduleSimilarityEdges,
      {
        entryId: current.entryId,
        namespace: args.namespace,
        embedding,
        apiKey: args.apiKey,
        similarityK: args.similarityK,
        similarityThreshold: args.similarityThreshold,
      },
    );

    await memoryEvents.append.appendToStream(ctx, {
      streamType: "contextMemory",
      namespace: args.namespace,
      streamId: current.entryId,
      eventId: crypto.randomUUID(),
      eventType: "edited",
      payload: { namespace: args.namespace, oldEntryId: args.entryId },
      ...(args.actor ? { actor: args.actor } : {}),
      ...(args.session ? { session: args.session } : {}),
      ...(args.threadId ? { metadata: { threadId: args.threadId } } : {}),
    });

    return { entryId: current.entryId };
  },
});
