import type { TypedListNodesByKeyReturn } from "@very-coffee/convex-graph";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { mutation, query } from "../_generated/server.js";
import {
  graph,
  type MemoryGraphNodeDefs,
  type MemoryOntologyNodeLabel,
} from "../graph.js";
import { memorySearchSourceRef } from "../internal/store.js";
import schema from "../schema.js";
import {
  lexicalSearch,
  MEMORY_SOURCE_SYSTEM,
  vectorSearch,
} from "../search.js";

const leanMemoryRecordValidator = v.object({
  _id: v.id("memoryRecords"),
  _creationTime: v.number(),
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
});

export const listMemoryRecordsPaginated = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(leanMemoryRecordValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const raw = await paginator(ctx.db, schema)
      .query("memoryRecords")
      .withIndex("by_namespace_key", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...raw,
      continueCursor: raw.continueCursor ?? "",
      page: raw.page.map((d) => ({
        _id: d._id,
        _creationTime: d._creationTime,
        namespace: d.namespace,
        key: d.key,
        title: d.title,
      })),
    };
  },
});

export const getMemoryRecord = query({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
  },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      text: v.optional(v.string()),
      title: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) return null;
    return { key: doc.key, text: doc.text, title: doc.title };
  },
});

export const patchMemoryRecordTitle = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      throw new Error(
        "patchMemoryRecordTitle: not found or namespace mismatch",
      );
    }
    const titleTrim = args.title.trim();
    if (!titleTrim) {
      return null;
    }
    await ctx.db.patch(args.memoryRecordId, { title: titleTrim });
    return null;
  },
});

/** Removes lexical + vector search items for this memory (`sourceRef` = memory id). */
export const deleteMemorySearchIndexes = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      return null;
    }
    const sourceRef = memorySearchSourceRef(args.memoryRecordId);
    await lexicalSearch.deleteItem(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
    });
    await vectorSearch.deleteItem(ctx, {
      namespace: args.namespace,
      sourceSystem: MEMORY_SOURCE_SYSTEM,
      sourceRef,
    });
    return null;
  },
});

export const deleteMemorySourceMapBatch = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    limit: v.number(),
  },
  returns: v.object({
    deleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      return { deleted: 0, hasMore: false };
    }
    const rows = await ctx.db
      .query("memorySourceMap")
      .withIndex("by_namespace_memory_search_backend", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("memoryRecord", args.memoryRecordId),
      )
      .take(args.limit);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return {
      deleted: rows.length,
      hasMore: rows.length === args.limit,
    };
  },
});

export const tryDeleteMemoryGraphNode = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      return null;
    }
    const key = args.memoryRecordId;

    const labels = new Set<MemoryOntologyNodeLabel>();
    let cursor: string | null = null;
    while (true) {
      const batch: TypedListNodesByKeyReturn<MemoryGraphNodeDefs> =
        await graph.nodes.listByKey(ctx, {
          key,
          paginationOpts: { numItems: 100, cursor },
        });
      for (const n of batch.page) {
        labels.add(n.label as MemoryOntologyNodeLabel);
      }
      if (batch.isDone) break;
      cursor = batch.continueCursor;
    }

    for (const label of labels) {
      await graph.nodes.delete(ctx, { label, key });
    }

    const sourceMaps = await ctx.db
      .query("memorySourceMap")
      .withIndex("by_namespace_memory_search_backend", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("memoryRecord", args.memoryRecordId),
      )
      .collect();
    for (const row of sourceMaps) {
      if (row.searchBackend === "graph") {
        await ctx.db.delete(row._id);
      }
    }

    return null;
  },
});

export const deleteMemoryRecordDocument = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      return null;
    }
    await ctx.db.delete(args.memoryRecordId);
    return null;
  },
});
