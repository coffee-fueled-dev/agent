import { v } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { Id as MemoryRecordId } from "../_components/memory/_generated/dataModel.js";
import {
  action,
  internalAction,
  internalQuery,
  internalMutation,
  mutation,
  query,
} from "../_generated/server.js";
import { memoryClient } from "../_clients/memory.js";
import {
  getFileEmbeddingApiUrl,
  getFileEmbeddingSecret,
} from "../filesEnv.js";

function requireSecret(secret: string) {
  if (secret !== getFileEmbeddingSecret()) {
    throw new Error("Unauthorized");
  }
}

const chunkValidator = v.object({
  text: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
});

export const generateFileUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setProcessFailed = internalMutation({
  args: {
    processId: v.id("fileProcesses"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      status: "failed",
      error: args.error,
    });
    return null;
  },
});

export const failFileProcess = mutation({
  args: {
    secret: v.string(),
    jobId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireSecret(args.secret);
    await ctx.db.patch(args.jobId as Id<"fileProcesses">, {
      status: "failed",
      error: args.error,
    });
    return null;
  },
});

export const cacheFileEmbeddingResult = mutation({
  args: {
    secret: v.string(),
    jobId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireSecret(args.secret);
    const process = await ctx.db.get(args.jobId as Id<"fileProcesses">);
    if (!process?.contentHash) {
      return null;
    }
    const hash = process.contentHash;
    const existing = await ctx.db
      .query("fileEmbeddingCache")
      .withIndex("by_content_hash", (q) => q.eq("contentHash", hash))
      .first();
    const payload = {
      contentHash: hash,
      jobId: args.jobId,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("fileEmbeddingCache", payload);
    }
    return null;
  },
});

export const getFileProcess = query({
  args: { processId: v.id("fileProcesses") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      memoryId: v.union(v.string(), v.null()),
      error: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.processId);
    if (!doc) return null;
    return {
      status: doc.status,
      memoryId: doc.memoryRecordId,
      error: doc.error ?? null,
    };
  },
});

export const getProcessForDispatch = internalQuery({
  args: { processId: v.id("fileProcesses") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("fileProcesses"),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileName: v.optional(v.string()),
      title: v.optional(v.string()),
      contentHash: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.processId);
    if (!doc) return null;
    return {
      _id: doc._id,
      storageId: doc.storageId,
      mimeType: doc.mimeType,
      fileName: doc.fileName,
      title: doc.title,
      contentHash: doc.contentHash,
    };
  },
});

export const dispatchEmbeddingJob = internalAction({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(internal.files.store.getProcessForDispatch, {
      processId: args.processId,
    });
    if (!doc) {
      return null;
    }
    const fileUrl = await ctx.storage.getUrl(doc.storageId);
    if (!fileUrl) {
      await ctx.runMutation(internal.files.store.setProcessFailed, {
        processId: args.processId,
        error: "Storage URL unavailable",
      });
      return null;
    }

    try {
      const res = await fetch(getFileEmbeddingApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-binary-embedding-secret": getFileEmbeddingSecret(),
        },
        body: JSON.stringify({
          jobId: doc._id,
          fileUrl,
          mimeType: doc.mimeType,
          fileName: doc.fileName ?? null,
          title: doc.title,
          contentHash: doc.contentHash,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Embedding server returned ${res.status}: ${text.slice(0, 200)}`,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "dispatch failed";
      await ctx.runMutation(internal.files.store.setProcessFailed, {
        processId: args.processId,
        error: message,
      });
    }
    return null;
  },
});

export const processFile = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    contentHash: v.optional(v.string()),
  },
  returns: v.object({
    processId: v.id("fileProcesses"),
    status: v.literal("processing"),
    memoryId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    processId: Id<"fileProcesses">;
    status: "processing";
    memoryId: string;
  }> => {
    const { memoryRecordId } = await memoryClient.mergeMemory(ctx, {
      namespace: args.namespace,
      key: args.key,
      content: [],
    });

    const processId = await ctx.runMutation(
      internal.files.store.insertFileProcess,
      {
        namespace: args.namespace,
        key: args.key,
        storageId: args.storageId,
        mimeType: args.mimeType,
        fileName: args.fileName,
        title: args.title,
        contentHash: args.contentHash,
        memoryRecordId: memoryRecordId as string,
        status: "processing",
      },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.files.store.dispatchEmbeddingJob,
      { processId },
    );

    return {
      processId,
      status: "processing" as const,
      memoryId: memoryRecordId as string,
    };
  },
});

export const insertFileProcess = internalMutation({
  args: {
    namespace: v.string(),
    key: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    title: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    memoryRecordId: v.string(),
    status: v.union(v.literal("processing"), v.literal("completed")),
  },
  returns: v.id("fileProcesses"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileProcesses", {
      namespace: args.namespace,
      key: args.key,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
      title: args.title,
      contentHash: args.contentHash,
      memoryRecordId: args.memoryRecordId,
      status: args.status,
    });
  },
});

export const completeFileProcess = internalMutation({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, { status: "completed" });
    return null;
  },
});

export const ingestFileEmbeddingChunk = action({
  args: {
    secret: v.string(),
    jobId: v.string(),
    chunkOrder: v.number(),
    chunk: chunkValidator,
    isLast: v.boolean(),
    retrievalText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireSecret(args.secret);
    const process = await ctx.runQuery(internal.files.store.getProcessForIngest, {
      jobId: args.jobId,
    });
    if (!process) {
      throw new Error("ingestFileEmbeddingChunk: process not found");
    }
    if (process.status === "failed" || process.status === "completed") {
      return null;
    }

    const item = buildIngestContentItem(args.chunk, args.retrievalText);
    await memoryClient.mergeMemory(ctx, {
      namespace: process.namespace,
      mode: "append",
      memoryRecordId: process.memoryRecordId as MemoryRecordId<"memoryRecords">,
      content: [item],
    });

    await ctx.runMutation(internal.files.store.patchIngestProgress, {
      processId: process._id,
      chunkOrder: args.chunkOrder,
      isLast: args.isLast,
    });
    return null;
  },
});

export const getProcessForIngest = internalQuery({
  args: { jobId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("fileProcesses"),
      namespace: v.string(),
      memoryRecordId: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.jobId as Id<"fileProcesses">);
    if (!doc) return null;
    return {
      _id: doc._id,
      namespace: doc.namespace,
      memoryRecordId: doc.memoryRecordId,
      status: doc.status,
    };
  },
});

export const patchIngestProgress = internalMutation({
  args: {
    processId: v.id("fileProcesses"),
    chunkOrder: v.number(),
    isLast: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: {
      lastChunkOrder: number;
      status?: "completed";
    } = { lastChunkOrder: args.chunkOrder };
    if (args.isLast) {
      patch.status = "completed";
    }
    await ctx.db.patch(args.processId, patch);
    return null;
  },
});

function buildIngestContentItem(
  chunk: { text?: string; embedding?: number[] },
  retrievalText?: string,
) {
  const text =
    chunk.text ??
    (retrievalText !== undefined && retrievalText.length > 0
      ? retrievalText
      : undefined);
  const emb = chunk.embedding;
  if (text !== undefined && emb !== undefined && emb.length > 0) {
    return { text, embedding: emb };
  }
  if (text !== undefined) {
    return { text };
  }
  if (emb !== undefined && emb.length > 0) {
    return { embedding: emb };
  }
  throw new Error("ingestFileEmbeddingChunk: empty chunk");
}
