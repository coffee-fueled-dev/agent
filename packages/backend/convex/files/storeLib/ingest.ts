import { memoryClient } from "../../_clients/memory.js";
import type { Id as MemoryRecordId } from "../../_components/memory/_generated/dataModel.js";
import { internal } from "../../_generated/api.js";
import type { ActionCtx } from "../../_generated/server.js";
import { requireEmbeddingSecret } from "./auth.js";
import { buildIngestContentItem } from "./ingestContent.js";

/** Matches {@link chunkValidator} in `./validators.ts`. */
type Chunk = { text?: string; embedding?: number[] };

export async function handleIngestFileEmbeddingChunk(
  ctx: ActionCtx,
  args: {
    secret: string;
    jobId: string;
    chunkOrder: number;
    chunk: Chunk;
    isLast: boolean;
    retrievalText?: string;
  },
) {
  requireEmbeddingSecret(args.secret);
  const process = await ctx.runQuery(internal.files.store.getProcessForIngest, {
    jobId: args.jobId,
  });
  if (!process) {
    throw new Error("ingestFileEmbeddingChunk: process not found");
  }
  if (process.status === "failed" || process.status === "completed") {
    return;
  }

  const item = buildIngestContentItem(args.chunk, args.retrievalText);
  await memoryClient.mergeMemory(ctx, {
    namespace: process.namespace,
    mode: "append",
    memoryRecordId: process.memoryRecordId as MemoryRecordId<"memoryRecords">,
    content: [item],
    skipCanonicalText: true,
    contentSource: {
      type: "storage",
      id: process.storageId as string,
    },
    fileName: process.fileName,
    mimeType: process.mimeType,
  });

  await ctx.runMutation(internal.files.store.patchIngestProgress, {
    processId: process._id,
    chunkOrder: args.chunkOrder,
    isLast: args.isLast,
  });
}

export async function handleIngestFileEmbeddingChunks(
  ctx: ActionCtx,
  args: {
    secret: string;
    jobId: string;
    chunks: Chunk[];
    lastChunkOrder: number;
    isLast: boolean;
  },
) {
  requireEmbeddingSecret(args.secret);
  if (args.chunks.length === 0) {
    throw new Error("ingestFileEmbeddingChunks: chunks must be non-empty");
  }
  const process = await ctx.runQuery(internal.files.store.getProcessForIngest, {
    jobId: args.jobId,
  });
  if (!process) {
    throw new Error("ingestFileEmbeddingChunks: process not found");
  }
  if (process.status === "failed" || process.status === "completed") {
    return;
  }

  const content = args.chunks.map((c) => buildIngestContentItem(c, undefined));
  await memoryClient.mergeMemory(ctx, {
    namespace: process.namespace,
    mode: "append",
    memoryRecordId: process.memoryRecordId as MemoryRecordId<"memoryRecords">,
    content,
    skipCanonicalText: true,
    contentSource: {
      type: "storage",
      id: process.storageId as string,
    },
    fileName: process.fileName,
    mimeType: process.mimeType,
  });

  await ctx.runMutation(internal.files.store.patchIngestProgress, {
    processId: process._id,
    chunkOrder: args.lastChunkOrder,
    isLast: args.isLast,
  });
}
