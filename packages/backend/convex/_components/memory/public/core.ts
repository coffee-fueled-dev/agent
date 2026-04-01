import type { EntryId } from "@convex-dev/rag";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, query } from "../_generated/server";
import { graph } from "../graph";
import { history } from "../history";
import { embedText } from "../internal/embedding";
import { createMemoryRag } from "../rag";
import { search as searchClient } from "../search";

const TEXT_PREVIEW_LENGTH = 280;

function featureId(memoryId: string) {
  return `memory:${memoryId}`;
}

const eventActorArgs = v.optional(
  v.object({
    byType: v.string(),
    byId: v.string(),
  }),
);

function historyActorAttrs(
  actor: { byType: string; byId: string } | undefined,
) {
  if (!actor) return {};
  return {
    attrs: {
      actor_by_type: actor.byType,
      actor_by_id: actor.byId,
    },
  };
}

type VersionSnapshot = {
  key: string;
  title?: string;
  textSnapshot: string;
};

function getVersionSnapshot(payload: unknown): VersionSnapshot | null {
  if (payload == null || typeof payload !== "object") return null;
  if (!("key" in payload) || !("textSnapshot" in payload)) return null;
  const { key, title, textSnapshot } = payload as {
    key?: unknown;
    title?: unknown;
    textSnapshot?: unknown;
  };
  if (typeof key !== "string" || typeof textSnapshot !== "string") return null;
  return {
    key,
    title: typeof title === "string" ? title : undefined,
    textSnapshot,
  };
}

const memoryDetailValidator = v.union(
  v.null(),
  v.object({
    namespace: v.string(),
    memoryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    fullText: v.string(),
    updatedAt: v.number(),
  }),
);

const versionRowValidator = v.object({
  entryId: v.string(),
  memoryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textSnapshot: v.string(),
  createdAt: v.number(),
});

const memoryListRowValidator = v.object({
  memoryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textPreview: v.string(),
  updatedAt: v.number(),
});

export const upsertMemory = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    chunks: v.optional(
      v.array(v.object({ text: v.string(), embedding: v.array(v.number()) })),
    ),
    sourceRef: v.optional(v.string()),
    searchText: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
    actor: eventActorArgs,
  },
  returns: v.object({ memoryId: v.string() }),
  handler: async (ctx, args) => {
    const rag = createMemoryRag(args.apiKey);
    const now = Date.now();

    const sourceMapping = args.sourceRef
      ? await ctx.runQuery(internal.internal.memoryStore.getSourceMapping, {
          namespace: args.namespace,
          sourceRef: args.sourceRef,
        })
      : null;

    const byKey = await ctx.runQuery(
      internal.internal.memoryStore.getByNamespaceKey,
      { namespace: args.namespace, key: args.key },
    );

    const resolvedMemoryId: string | null =
      sourceMapping?.memoryId ?? byKey?.memoryId ?? null;

    const existingRow = resolvedMemoryId
      ? await ctx.runQuery(internal.internal.memoryStore.getByMemoryId, {
          memoryId: resolvedMemoryId,
        })
      : null;

    const ragKey = existingRow?.key ?? args.key;

    const embedding =
      args.chunks?.[0]?.embedding ?? (await embedText(args.text, args.apiKey));

    const ragResult = await rag.add(ctx, {
      namespace: args.namespace,
      key: ragKey,
      title: args.title,
      chunks: args.chunks ?? [{ text: args.text, embedding }],
      filterValues: [{ name: "status", value: "current" }],
    });

    const memoryId = ragResult.entryId as string;
    const textPreview = args.text.slice(0, TEXT_PREVIEW_LENGTH);

    if (!resolvedMemoryId) {
      await ctx.runMutation(internal.internal.memoryStore.insertRecord, {
        namespace: args.namespace,
        memoryId,
        key: ragKey,
        title: args.title,
        textPreview,
        updatedAt: now,
      });
      if (args.sourceRef) {
        await ctx.runMutation(internal.internal.memoryStore.upsertSourceMap, {
          namespace: args.namespace,
          sourceRef: args.sourceRef,
          memoryId,
        });
      }
      await history.append(ctx, {
        streamType: "memoryRecord",
        streamId: memoryId,
        entryId: memoryId,
        kind: "created",
        payload: {
          key: ragKey,
          title: args.title,
          textPreview,
          textSnapshot: args.text,
        },
        ...historyActorAttrs(args.actor),
      });
      await graph.nodes.create(ctx, {
        label: "memoryRecord",
        key: memoryId,
      });
    } else {
      await ctx.runMutation(internal.internal.memoryStore.patchRecord, {
        memoryId,
        key: args.key !== ragKey ? args.key : undefined,
        title: args.title,
        textPreview,
        updatedAt: now,
      });
      if (args.sourceRef) {
        await ctx.runMutation(internal.internal.memoryStore.upsertSourceMap, {
          namespace: args.namespace,
          sourceRef: args.sourceRef,
          memoryId,
        });
      }
      const heads = await history.listHeads(ctx, {
        streamType: "memoryRecord",
        streamId: memoryId,
      });
      await history.append(ctx, {
        streamType: "memoryRecord",
        streamId: memoryId,
        entryId: memoryId,
        kind: "edited",
        parentEntryIds:
          heads.length > 0 ? heads.map((h) => h.entryId) : undefined,
        payload: {
          key: args.key,
          title: args.title,
          textPreview,
          textSnapshot: args.text,
        },
        ...historyActorAttrs(args.actor),
      });
    }

    await ctx.runMutation(internal.internal.embeddingStore.upsert, {
      memoryId,
      namespace: args.namespace,
      embedding,
    });

    await searchClient.upsertFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(memoryId),
      sourceSystem: "memory",
      sourceRef: memoryId,
      title: args.title,
      text: args.searchText ?? args.text,
    });

    await ctx.runMutation(internal.internal.community.markCommunitiesStale, {
      namespace: args.namespace,
    });

    await ctx.runMutation(
      internal.internal.similarity.scheduleSimilarityEdges,
      {
        memoryId,
        namespace: args.namespace,
        embedding,
        apiKey: args.apiKey,
        similarityK: args.similarityK,
        similarityThreshold: args.similarityThreshold,
      },
    );

    return { memoryId };
  },
});

export const getMemory = query({
  args: { namespace: v.string(), memoryId: v.string() },
  returns: memoryDetailValidator,
  handler: async (ctx, args) => {
    const rag = createMemoryRag();
    const row = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (!row || row.namespace !== args.namespace) return null;

    const chunks = await rag.listChunks(ctx, {
      entryId: args.memoryId as EntryId,
      paginationOpts: { cursor: null, numItems: 1000 },
    });

    return {
      namespace: row.namespace,
      memoryId: row.memoryId,
      key: row.key,
      title: row.title,
      textPreview: row.textPreview,
      fullText: chunks.page.map((c) => c.text).join("\n"),
      updatedAt: row.updatedAt,
    };
  },
});

export const listMemoryPage = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(memoryListRowValidator),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("memoryRecords")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((row) => ({
        memoryId: row.memoryId,
        key: row.key,
        title: row.title,
        textPreview: row.textPreview,
        updatedAt: row.updatedAt,
      })),
    };
  },
});

export const listVersionsPage = query({
  args: {
    namespace: v.string(),
    memoryId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(versionRowValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (!row || row.namespace !== args.namespace) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const result = await history.listEntries(ctx, {
      streamType: "memoryRecord",
      streamId: args.memoryId,
      paginationOpts: args.paginationOpts,
    });

    const page = result.page.flatMap((entry) => {
      const snapshot = getVersionSnapshot(entry.payload);
      if (!snapshot) return [];
      return [
        {
          entryId: entry.entryId,
          memoryId: args.memoryId,
          key: snapshot.key,
          title: snapshot.title,
          textSnapshot: snapshot.textSnapshot,
          createdAt: entry.entryTime,
        },
      ];
    });

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const recallVersion = query({
  args: { namespace: v.string(), entryId: v.string(), memoryId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      entryId: v.string(),
      memoryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      textSnapshot: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const mem = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (!mem || mem.namespace !== args.namespace) return null;

    const row = await history.getEntry(ctx, {
      streamType: "memoryRecord",
      streamId: args.memoryId,
      entryId: args.entryId,
    });
    if (!row) return null;
    const snapshot = getVersionSnapshot(row.payload);
    if (!snapshot) return null;
    return {
      entryId: row.entryId,
      memoryId: args.memoryId,
      key: snapshot.key,
      title: snapshot.title,
      textSnapshot: snapshot.textSnapshot,
      createdAt: row.entryTime,
    };
  },
});

export const removeMemory = action({
  args: {
    namespace: v.string(),
    memoryId: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rag = createMemoryRag(args.apiKey);
    await rag.delete(ctx, { entryId: args.memoryId as EntryId });
    await searchClient.deleteFeature(ctx, {
      namespace: args.namespace,
      featureId: featureId(args.memoryId),
    });
    await ctx.runMutation(internal.internal.embeddingStore.remove, {
      memoryId: args.memoryId,
    });
    await graph.nodes.delete(ctx, {
      label: "memoryRecord",
      key: args.memoryId,
    });
    await ctx.runMutation(internal.internal.memoryStore.deleteRecord, args);
    await ctx.runMutation(
      internal.internal.memoryStore.deleteSourceMapsForMemory,
      args,
    );
    await ctx.runMutation(internal.internal.community.markCommunitiesStale, {
      namespace: args.namespace,
    });
  },
});
