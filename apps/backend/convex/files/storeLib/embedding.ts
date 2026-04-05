import { internal } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import type { ActionCtx } from "../../_generated/server.js";
import {
  getFileEmbeddingApiUrl,
  getFileEmbeddingSecret,
  isFileEmbeddingApiConfigured,
} from "../../env/embedding.js";
import { mintFileUrlForNamespace } from "../storageAccess.js";

export async function handleDispatchEmbeddingJob(
  ctx: ActionCtx,
  args: { processId: Id<"fileProcesses"> },
) {
  const doc = await ctx.runQuery(internal.files.store.getProcessForDispatch, {
    processId: args.processId,
  });
  if (!doc) {
    return;
  }
  let fileUrl: string;
  try {
    fileUrl = await mintFileUrlForNamespace(ctx, {
      namespace: doc.namespace,
      storageId: doc.storageId,
    });
  } catch (e) {
    await ctx.runMutation(internal.files.store.setProcessFailed, {
      processId: args.processId,
      error: e instanceof Error ? e.message : "Storage URL unavailable",
    });
    return;
  }

  if (!isFileEmbeddingApiConfigured()) {
    await ctx.runMutation(internal.files.store.setProcessFailed, {
      processId: args.processId,
      error:
        "FILE_EMBEDDING_API_URL is not set in Convex environment; file embedding is disabled",
    });
    return;
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
}

export async function handleProcessFile(
  ctx: ActionCtx,
  args: {
    namespace: string;
    key: string;
    title?: string;
    storageId: Id<"_storage">;
    mimeType: string;
    fileName?: string;
    contentHash?: string;
  },
): Promise<{
  processId: Id<"fileProcesses">;
  status: "pending" | "processing" | "completed" | "failed";
  memoryId: string;
}> {
  const result: {
    processId: Id<"fileProcesses">;
    memoryRecordId: string;
    status: "pending" | "processing" | "completed" | "failed";
    scheduledDispatch: boolean;
  } = await ctx.runMutation(internal.files.store.startFileProcess, args);
  if (result.scheduledDispatch) {
    await ctx.scheduler.runAfter(0, internal.files.store.dispatchEmbeddingJob, {
      processId: result.processId,
    });
  }
  return {
    processId: result.processId,
    status: result.status,
    memoryId: result.memoryRecordId,
  };
}
