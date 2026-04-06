import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { mutation, query } from "../_generated/server";
import { upsertSourceMapLink } from "../internal/store.js";
import schema from "../schema.js";

const contentSourceValidator = v.object({
  type: v.string(),
  id: v.string(),
});

/**
 * Seed lexical + vector source map rows for file-backed memories before any chunks are indexed,
 * so resolution has storage id + file metadata. `searchItemId` is filled when the first slice is ingested.
 */
export const registerStorageSourceMetadata = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    contentSource: contentSourceValidator,
    fileName: v.optional(v.string()),
    mimeType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      throw new Error("registerStorageSourceMetadata: memory record not found");
    }
    if (args.contentSource.type !== "storage") {
      throw new Error(
        "registerStorageSourceMetadata: expected storage contentSource",
      );
    }
    for (const searchBackend of ["lexical", "vector"] as const) {
      await upsertSourceMapLink(ctx, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        contentSource: args.contentSource,
        searchBackend,
        searchItemId: "",
        fileName: args.fileName,
        mimeType: args.mimeType,
      });
    }
    return null;
  },
});

const sourceMapRowValidator = v.object({
  contentSource: v.object({
    type: v.string(),
    id: v.string(),
  }),
  searchBackend: v.union(
    v.literal("lexical"),
    v.literal("vector"),
    v.literal("graph"),
  ),
  searchItemId: v.string(),
  fileName: v.optional(v.string()),
  mimeType: v.optional(v.string()),
});

const sourceMapsPageResultValidator = v.object({
  page: v.array(sourceMapRowValidator),
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
});

function mapSourceMapRow(r: {
  contentSource: { type: string; id: string };
  searchBackend: "lexical" | "vector" | "graph";
  searchItemId: string;
  fileName?: string;
  mimeType?: string;
}) {
  return {
    contentSource: r.contentSource,
    searchBackend: r.searchBackend,
    searchItemId: r.searchItemId,
    fileName: r.fileName,
    mimeType: r.mimeType,
  };
}

/**
 * Source map rows for a memory.
 *
 * Without `paginationOpts`: returns all matching rows (legacy array), using
 * `by_namespace_memory_search_backend` or `by_namespace_memory_content_backend` when `type` is set.
 *
 * With `paginationOpts`: returns a paginated `{ page, isDone, continueCursor, ... }` using the
 * convex-helpers paginator. Use optional `searchBackend` with `by_namespace_memory_search_backend`
 * for graph-only (or lexical / vector) pages without scanning other backends.
 */
export const listSourceMapsForMemory = query({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    /** When set, only rows whose `contentSource.type` matches (indexed read). */
    type: v.optional(v.string()),
    /** When set with pagination, filter by backend (indexed via `by_namespace_memory_search_backend`). */
    searchBackend: v.optional(
      v.union(v.literal("lexical"), v.literal("vector"), v.literal("graph")),
    ),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    v.array(sourceMapRowValidator),
    sourceMapsPageResultValidator,
  ),
  handler: async (ctx, args) => {
    const emptyPage = {
      page: [] as Array<{
        contentSource: { type: string; id: string };
        searchBackend: "lexical" | "vector" | "graph";
        searchItemId: string;
        fileName?: string;
        mimeType?: string;
      }>,
      isDone: true,
      continueCursor: "",
    };

    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      if (args.paginationOpts !== undefined) {
        return emptyPage;
      }
      return [];
    }

    const typeFilter = args.type?.trim();
    const hasType = typeFilter !== undefined && typeFilter.length > 0;

    if (args.paginationOpts !== undefined) {
      const po = args.paginationOpts;
      if (hasType) {
        const raw = await paginator(ctx.db, schema)
          .query("memorySourceMap")
          .withIndex("by_namespace_memory_content_backend", (q) =>
            q
              .eq("namespace", args.namespace)
              .eq("memoryRecord", args.memoryRecordId)
              .eq("contentSource.type", typeFilter),
          )
          .order("desc")
          .paginate(po);
        let page = raw.page.map(mapSourceMapRow);
        if (args.searchBackend !== undefined) {
          page = page.filter((r) => r.searchBackend === args.searchBackend);
        }
        return {
          ...raw,
          continueCursor: raw.continueCursor ?? "",
          page,
        };
      }
      if (args.searchBackend !== undefined) {
        const backend = args.searchBackend;
        const raw = await paginator(ctx.db, schema)
          .query("memorySourceMap")
          .withIndex("by_namespace_memory_search_backend", (q) =>
            q
              .eq("namespace", args.namespace)
              .eq("memoryRecord", args.memoryRecordId)
              .eq("searchBackend", backend),
          )
          .order("desc")
          .paginate(po);
        return {
          ...raw,
          continueCursor: raw.continueCursor ?? "",
          page: raw.page.map(mapSourceMapRow),
        };
      }
      const raw = await paginator(ctx.db, schema)
        .query("memorySourceMap")
        .withIndex("by_namespace_memory_search_backend", (q) =>
          q
            .eq("namespace", args.namespace)
            .eq("memoryRecord", args.memoryRecordId),
        )
        .order("desc")
        .paginate(po);
      return {
        ...raw,
        continueCursor: raw.continueCursor ?? "",
        page: raw.page.map(mapSourceMapRow),
      };
    }

    const rows = hasType
      ? await ctx.db
          .query("memorySourceMap")
          .withIndex("by_namespace_memory_content_backend", (q) =>
            q
              .eq("namespace", args.namespace)
              .eq("memoryRecord", args.memoryRecordId)
              .eq("contentSource.type", typeFilter),
          )
          .collect()
      : await ctx.db
          .query("memorySourceMap")
          .withIndex("by_namespace_memory_search_backend", (q) =>
            q
              .eq("namespace", args.namespace)
              .eq("memoryRecord", args.memoryRecordId),
          )
          .collect();

    let mapped = rows.map(mapSourceMapRow);
    if (args.searchBackend !== undefined) {
      mapped = mapped.filter((r) => r.searchBackend === args.searchBackend);
    }
    return mapped;
  },
});
