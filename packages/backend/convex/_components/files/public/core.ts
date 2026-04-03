import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const fileChunkValidator = v.object({
  text: v.optional(v.string()),
  embedding: v.array(v.number()),
});

const fileProcessValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("fileProcesses"),
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("dispatched"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    memoryId: v.optional(v.string()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }),
);

const fileCacheValidator = v.union(
  v.null(),
  v.object({
    contentHash: v.string(),
    mimeType: v.string(),
    retrievalText: v.string(),
    lexicalText: v.optional(v.string()),
    chunks: v.array(fileChunkValidator),
    updatedAt: v.number(),
  }),
);

export const createFileProcess = mutation({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    contentHash: v.optional(v.string()),
  },
  returns: v.id("fileProcesses"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileProcesses", {
      ...args,
      status: "pending",
      updatedAt: Date.now(),
    });
  },
});

export const markFileProcessDispatched = mutation({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      status: "dispatched",
      updatedAt: Date.now(),
      error: undefined,
    });
    return null;
  },
});

export const markFileProcessCompleted = mutation({
  args: {
    processId: v.id("fileProcesses"),
    memoryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      status: "completed",
      memoryId: args.memoryId,
      error: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markFileProcessFailed = mutation({
  args: {
    processId: v.id("fileProcesses"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getFileProcess = query({
  args: { processId: v.id("fileProcesses") },
  returns: fileProcessValidator,
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.processId);
    if (!row) return null;
    return {
      _id: row._id,
      namespace: row.namespace,
      key: row.key,
      title: row.title,
      storageId: row.storageId,
      mimeType: row.mimeType,
      fileName: row.fileName,
      contentHash: row.contentHash,
      status: row.status,
      memoryId: row.memoryId,
      error: row.error,
      updatedAt: row.updatedAt,
    };
  },
});

export const listFileProcessesPage = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      processId: v.id("fileProcesses"),
      key: v.string(),
      title: v.optional(v.string()),
      mimeType: v.string(),
      fileName: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      memoryId: v.optional(v.string()),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("fileProcesses")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((row) => ({
        processId: row._id,
        key: row.key,
        title: row.title,
        mimeType: row.mimeType,
        fileName: row.fileName,
        status: row.status,
        memoryId: row.memoryId,
        error: row.error,
        updatedAt: row.updatedAt,
      })),
    };
  },
});

export const getLatestFileForMemory = query({
  args: {
    namespace: v.string(),
    memoryId: v.string(),
  },
  returns: fileProcessValidator,
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fileProcesses")
      .withIndex("by_memoryId_updatedAt", (q) =>
        q.eq("memoryId", args.memoryId),
      )
      .order("desc")
      .take(20);
    const row =
      rows.find((candidate) => candidate.namespace === args.namespace) ?? null;
    if (!row) return null;
    return {
      _id: row._id,
      namespace: row.namespace,
      key: row.key,
      title: row.title,
      storageId: row.storageId,
      mimeType: row.mimeType,
      fileName: row.fileName,
      contentHash: row.contentHash,
      status: row.status,
      memoryId: row.memoryId,
      error: row.error,
      updatedAt: row.updatedAt,
    };
  },
});

export const getCachedFileResult = query({
  args: { contentHash: v.string() },
  returns: fileCacheValidator,
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("fileResultCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .first();
    if (!row) return null;
    return {
      contentHash: row.contentHash,
      mimeType: row.mimeType,
      retrievalText: row.retrievalText,
      lexicalText: row.lexicalText,
      chunks: row.chunks,
      updatedAt: row.updatedAt,
    };
  },
});

export const insertFileEmbeddingChunkBatch = mutation({
  args: {
    processId: v.id("fileProcesses"),
    batchIndex: v.number(),
    chunks: v.array(fileChunkValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fileEmbeddingChunkBatches")
      .withIndex("by_process_batch", (q) =>
        q.eq("processId", args.processId).eq("batchIndex", args.batchIndex),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { chunks: args.chunks });
    } else {
      await ctx.db.insert("fileEmbeddingChunkBatches", {
        processId: args.processId,
        batchIndex: args.batchIndex,
        chunks: args.chunks,
      });
    }
    return null;
  },
});

export const listFileEmbeddingChunkBatchesForProcess = query({
  args: { processId: v.id("fileProcesses") },
  returns: v.array(
    v.object({
      batchIndex: v.number(),
      chunks: v.array(fileChunkValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fileEmbeddingChunkBatches")
      .withIndex("by_process_batch", (q) => q.eq("processId", args.processId))
      .collect();
    rows.sort((a, b) => a.batchIndex - b.batchIndex);
    return rows.map((r) => ({
      batchIndex: r.batchIndex,
      chunks: r.chunks,
    }));
  },
});

export const deleteFileEmbeddingChunkBatchesForProcess = mutation({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fileEmbeddingChunkBatches")
      .withIndex("by_process_batch", (q) => q.eq("processId", args.processId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

export const upsertCachedFileResult = mutation({
  args: {
    contentHash: v.string(),
    mimeType: v.string(),
    retrievalText: v.string(),
    lexicalText: v.optional(v.string()),
    chunks: v.array(fileChunkValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fileResultCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .first();
    const patch = {
      mimeType: args.mimeType,
      retrievalText: args.retrievalText,
      lexicalText: args.lexicalText,
      chunks: args.chunks,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("fileResultCache", {
        contentHash: args.contentHash,
        ...patch,
      });
    }
    return null;
  },
});
