import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { filesClient } from "./_clients/files.js";
import { memoryClient } from "./_clients/memory.js";
import type { Id } from "./_generated/dataModel.js";
import {
  type ActionCtx,
  action,
  mutation,
  query,
} from "./_generated/server.js";
import { getEmbeddingServerUrl, getFileEmbeddingSecret } from "./filesEnv.js";

const fileChunkValidator = v.object({
  text: v.optional(v.string()),
  embedding: v.array(v.number()),
});

const processStatusValidator = v.union(
  v.literal("pending"),
  v.literal("dispatched"),
  v.literal("completed"),
  v.literal("failed"),
);

const processResultValidator = v.union(
  v.object({
    processId: v.id("fileProcesses"),
    status: v.literal("dispatched"),
  }),
  v.object({
    processId: v.id("fileProcesses"),
    status: v.literal("completed"),
    memoryId: v.string(),
  }),
);

function normalizeChunks(
  retrievalText: string,
  chunks: Array<{ text?: string; embedding: number[] }>,
) {
  return chunks.map((chunk) => ({
    text: chunk.text ?? retrievalText,
    embedding: chunk.embedding,
  }));
}

async function completeProcessWithPayload(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  args: {
    processId: Id<"fileProcesses">;
    retrievalText: string;
    lexicalText?: string;
    chunks: Array<{ text?: string; embedding: number[] }>;
  },
) {
  const process = await filesClient.getFileProcess(ctx, {
    processId: args.processId,
  });
  if (!process) {
    throw new Error(`File process ${args.processId} not found`);
  }
  if (process.status === "completed" && process.memoryId) {
    return {
      processId: args.processId,
      status: "completed" as const,
      memoryId: process.memoryId,
    };
  }

  if (args.chunks.length === 0) {
    throw new Error("At least one embedding chunk is required");
  }

  const memory = await memoryClient.upsertMemory(ctx, {
    namespace: process.namespace,
    key: process.key,
    title: process.title,
    text: args.retrievalText,
    searchText: args.lexicalText ?? args.retrievalText,
    chunks: normalizeChunks(args.retrievalText, args.chunks),
    sourceRef: `file:${process._id}`,
  });

  await filesClient.markFileProcessCompleted(ctx, {
    processId: args.processId,
    memoryId: memory.memoryId,
  });

  if (process.contentHash) {
    await filesClient.upsertCachedFileResult(ctx, {
      contentHash: process.contentHash,
      mimeType: process.mimeType,
      retrievalText: args.retrievalText,
      lexicalText: args.lexicalText,
      chunks: args.chunks,
    });
  }

  return {
    processId: args.processId,
    status: "completed" as const,
    memoryId: memory.memoryId,
  };
}

export const generateFileUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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
  returns: processResultValidator,
  handler: async (ctx, args) => {
    const processId = (await filesClient.createFileProcess(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
      contentHash: args.contentHash,
    })) as Id<"fileProcesses">;

    if (args.contentHash) {
      const cached = await filesClient.getCachedFileResult(ctx, {
        contentHash: args.contentHash,
      });
      if (cached) {
        return await completeProcessWithPayload(ctx, {
          processId,
          retrievalText: cached.retrievalText,
          lexicalText: cached.lexicalText,
          chunks: cached.chunks,
        });
      }
    }

    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      const error = `Could not resolve URL for ${args.storageId}`;
      await filesClient.markFileProcessFailed(ctx, { processId, error });
      throw new Error(error);
    }

    try {
      const response = await fetch(`${getEmbeddingServerUrl()}/embed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-binary-embedding-secret": getFileEmbeddingSecret(),
        },
        body: JSON.stringify({
          jobId: processId,
          fileUrl,
          namespace: args.namespace,
          key: args.key,
          title: args.title,
          mimeType: args.mimeType,
          fileName: args.fileName ?? null,
          contentHash: args.contentHash,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Embedding server rejected the job (${response.status})`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dispatch failed";
      await filesClient.markFileProcessFailed(ctx, {
        processId,
        error: message,
      });
      throw error;
    }

    await filesClient.markFileProcessDispatched(ctx, { processId });
    return { processId, status: "dispatched" as const };
  },
});

export const completeFileProcess = action({
  args: {
    secret: v.string(),
    jobId: v.id("fileProcesses"),
    retrievalText: v.string(),
    lexicalText: v.optional(v.string()),
    chunks: v.array(fileChunkValidator),
  },
  returns: processResultValidator,
  handler: async (ctx, args) => {
    if (args.secret !== getFileEmbeddingSecret()) {
      throw new Error("Unauthorized");
    }
    return await completeProcessWithPayload(ctx, {
      processId: args.jobId,
      retrievalText: args.retrievalText,
      lexicalText: args.lexicalText,
      chunks: args.chunks,
    });
  },
});

export const failFileProcess = mutation({
  args: {
    secret: v.string(),
    jobId: v.id("fileProcesses"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.secret !== getFileEmbeddingSecret()) {
      throw new Error("Unauthorized");
    }
    await filesClient.markFileProcessFailed(ctx, {
      processId: args.jobId,
      error: args.error,
    });
    return null;
  },
});

export const getFileProcess = query({
  args: { processId: v.id("fileProcesses") },
  returns: v.union(
    v.null(),
    v.object({
      processId: v.id("fileProcesses"),
      namespace: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileName: v.optional(v.string()),
      contentHash: v.optional(v.string()),
      status: processStatusValidator,
      memoryId: v.optional(v.string()),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await filesClient.getFileProcess(ctx, args);
    if (!row) return null;
    return {
      processId: args.processId,
      namespace: row.namespace,
      key: row.key,
      title: row.title,
      storageId: row.storageId as Id<"_storage">,
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
      status: processStatusValidator,
      memoryId: v.optional(v.string()),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const result = await filesClient.listFileProcessesPage(ctx, args);
    return {
      ...result,
      page: result.page.map((row) => ({
        processId: row.processId as Id<"fileProcesses">,
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

export const getFileForMemory = query({
  args: {
    namespace: v.string(),
    memoryId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      processId: v.id("fileProcesses"),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileName: v.optional(v.string()),
      contentHash: v.optional(v.string()),
      url: v.union(v.null(), v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await filesClient.getLatestFileForMemory(ctx, args);
    if (!row) return null;
    const url = await ctx.storage.getUrl(row.storageId as Id<"_storage">);
    return {
      processId: row._id as Id<"fileProcesses">,
      storageId: row.storageId as Id<"_storage">,
      mimeType: row.mimeType,
      fileName: row.fileName,
      contentHash: row.contentHash,
      url,
      updatedAt: row.updatedAt,
    };
  },
});
