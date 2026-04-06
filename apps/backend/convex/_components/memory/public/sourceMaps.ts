import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { upsertSourceMapLink } from "../internal/store.js";

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

/**
 * Source map rows for a memory. Without `type`, returns all rows via `by_namespace_memoryRecord`.
 * With `type`, filters by `contentSource.type` using `by_namespace_memory_content_backend`.
 */
export const listSourceMapsForMemory = query({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    /** When set, only rows whose `contentSource.type` matches (indexed read). */
    type: v.optional(v.string()),
  },
  returns: v.array(sourceMapRowValidator),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) {
      return [];
    }

    const typeFilter = args.type?.trim();
    const rows =
      typeFilter !== undefined && typeFilter.length > 0
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
            .withIndex("by_namespace_memoryRecord", (q) =>
              q
                .eq("namespace", args.namespace)
                .eq("memoryRecord", args.memoryRecordId),
            )
            .collect();

    return rows.map((r) => ({
      contentSource: r.contentSource,
      searchBackend: r.searchBackend,
      searchItemId: r.searchItemId,
      fileName: r.fileName,
      mimeType: r.mimeType,
    }));
  },
});
