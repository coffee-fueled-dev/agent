import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server.js";
import {
  handleDispatchEmbeddingJob,
  handleProcessFile,
} from "./storeLib/embedding.js";
import {
  handleIngestFileEmbeddingChunk,
  handleIngestFileEmbeddingChunks,
} from "./storeLib/ingest.js";
import {
  handleCacheFileEmbeddingResult,
  handleCompleteFileProcess,
  handleFailFileProcess,
  handleGetFileProcess,
  handleGetProcessForDispatch,
  handleGetProcessForIngest,
  handlePatchIngestProgress,
  handleSetProcessFailed,
  handleStartFileProcess,
} from "./storeLib/processDb.js";
import {
  handleGenerateFileUploadUrl,
  handleGetAttachmentPublicUrl,
} from "./storeLib/urls.js";
import { chunkValidator } from "./storeLib/validators.js";

export const generateFileUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => handleGenerateFileUploadUrl(ctx),
});

/** Mint a display/fetch URL for an attachment; same pipeline as embedding and model attach. */
export const getAttachmentPublicUrl = query({
  args: {
    namespace: v.string(),
    storageId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => handleGetAttachmentPublicUrl(ctx, args),
});

export const setProcessFailed = internalMutation({
  args: {
    processId: v.id("fileProcesses"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await handleSetProcessFailed(ctx, args);
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
    await handleFailFileProcess(ctx, args);
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
    await handleCacheFileEmbeddingResult(ctx, args);
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
  handler: async (ctx, args) => handleGetFileProcess(ctx, args),
});

export const getProcessForDispatch = internalQuery({
  args: { processId: v.id("fileProcesses") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("fileProcesses"),
      namespace: v.string(),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileName: v.optional(v.string()),
      title: v.optional(v.string()),
      contentHash: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => handleGetProcessForDispatch(ctx, args),
});

export const startFileProcess = internalMutation({
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
    memoryRecordId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    scheduledDispatch: v.boolean(),
  }),
  handler: async (ctx, args) => handleStartFileProcess(ctx, args),
});

export const dispatchEmbeddingJob = internalAction({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await handleDispatchEmbeddingJob(ctx, args);
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
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    memoryId: v.string(),
  }),
  handler: async (ctx, args) => handleProcessFile(ctx, args),
});

export const completeFileProcess = internalMutation({
  args: { processId: v.id("fileProcesses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await handleCompleteFileProcess(ctx, args);
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
    await handleIngestFileEmbeddingChunk(ctx, args);
    return null;
  },
});

/**
 * Append many chunks in one round trip. Slice keys stay deterministic (`nextChunkSeq` + index within batch).
 */
export const ingestFileEmbeddingChunks = action({
  args: {
    secret: v.string(),
    jobId: v.string(),
    chunks: v.array(chunkValidator),
    /** Global index of the last chunk in this batch (for progress UI). */
    lastChunkOrder: v.number(),
    isLast: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await handleIngestFileEmbeddingChunks(ctx, args);
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
      storageId: v.id("_storage"),
      fileName: v.optional(v.string()),
      mimeType: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    }),
  ),
  handler: async (ctx, args) => handleGetProcessForIngest(ctx, args),
});

export const patchIngestProgress = internalMutation({
  args: {
    processId: v.id("fileProcesses"),
    chunkOrder: v.number(),
    isLast: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await handlePatchIngestProgress(ctx, args);
    return null;
  },
});
