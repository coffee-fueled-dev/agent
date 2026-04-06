import { memoryClient } from "../../_clients/memory.js";
import type { Id as MemoryRecordId } from "../../_components/memory/_generated/dataModel.js";
import { DEFAULT_FILE_MEMORY_ONTOLOGY_NODE_LABEL } from "../../_components/memory/graph.js";
import type { Id } from "../../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../../_generated/server.js";
import { requireEmbeddingSecret } from "./auth.js";

async function findExistingFileProcessForIdempotency(
  ctx: Pick<MutationCtx, "db">,
  args: {
    namespace: string;
    storageId: Id<"_storage">;
    contentHash?: string;
  },
): Promise<{
  _id: Id<"fileProcesses">;
  memoryRecordId: string;
  status: "pending" | "processing" | "completed" | "failed";
} | null> {
  if (args.contentHash !== undefined && args.contentHash.length > 0) {
    const byHash = await ctx.db
      .query("fileProcesses")
      .withIndex("by_namespace_content_hash", (q) =>
        q.eq("namespace", args.namespace).eq("contentHash", args.contentHash),
      )
      .first();
    if (byHash) {
      return {
        _id: byHash._id,
        memoryRecordId: byHash.memoryRecordId,
        status: byHash.status,
      };
    }
    return null;
  }

  const byStorage = await ctx.db
    .query("fileProcesses")
    .withIndex("by_namespace_storage", (q) =>
      q.eq("namespace", args.namespace).eq("storageId", args.storageId),
    )
    .first();
  if (!byStorage) return null;
  return {
    _id: byStorage._id,
    memoryRecordId: byStorage.memoryRecordId,
    status: byStorage.status,
  };
}

export async function handleSetProcessFailed(
  ctx: MutationCtx,
  args: { processId: Id<"fileProcesses">; error: string },
) {
  await ctx.db.patch(args.processId, {
    status: "failed",
    error: args.error,
  });
}

export async function handleFailFileProcess(
  ctx: MutationCtx,
  args: { secret: string; jobId: string; error: string },
) {
  requireEmbeddingSecret(args.secret);
  await ctx.db.patch(args.jobId as Id<"fileProcesses">, {
    status: "failed",
    error: args.error,
  });
}

export async function handleCacheFileEmbeddingResult(
  ctx: MutationCtx,
  args: { secret: string; jobId: string },
) {
  requireEmbeddingSecret(args.secret);
  const process = await ctx.db.get(args.jobId as Id<"fileProcesses">);
  if (!process?.contentHash) {
    return;
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
}

export async function handleGetFileProcess(
  ctx: QueryCtx,
  args: { processId: Id<"fileProcesses"> },
) {
  const doc = await ctx.db.get(args.processId);
  if (!doc) return null;
  return {
    status: doc.status,
    memoryId: doc.memoryRecordId,
    error: doc.error ?? null,
  };
}

export async function handleGetProcessForDispatch(
  ctx: QueryCtx,
  args: { processId: Id<"fileProcesses"> },
) {
  const doc = await ctx.db.get(args.processId);
  if (!doc) return null;
  return {
    _id: doc._id,
    namespace: doc.namespace,
    storageId: doc.storageId,
    mimeType: doc.mimeType,
    fileName: doc.fileName,
    title: doc.title,
    contentHash: doc.contentHash,
  };
}

export async function handleGetProcessForIngest(
  ctx: QueryCtx,
  args: { jobId: string },
) {
  const doc = await ctx.db.get(args.jobId as Id<"fileProcesses">);
  if (!doc) return null;
  return {
    _id: doc._id,
    namespace: doc.namespace,
    memoryRecordId: doc.memoryRecordId,
    storageId: doc.storageId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    status: doc.status,
  };
}

export async function handleStartFileProcess(
  ctx: MutationCtx,
  args: {
    namespace: string;
    key: string;
    title?: string;
    storageId: Id<"_storage">;
    mimeType: string;
    fileName?: string;
    contentHash?: string;
    /** When set, ingest file chunks into this existing memory (same namespace). */
    memoryRecordId?: string;
  },
) {
  const existing = await findExistingFileProcessForIdempotency(ctx, {
    namespace: args.namespace,
    storageId: args.storageId,
    contentHash: args.contentHash,
  });
  if (existing) {
    return {
      processId: existing._id,
      memoryRecordId: existing.memoryRecordId,
      status: existing.status,
      scheduledDispatch: false,
    };
  }

  let memoryRecordId: string;

  if (args.memoryRecordId) {
    const record = await memoryClient.getMemoryRecord(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as MemoryRecordId<"memoryRecords">,
    });
    if (!record) {
      throw new Error(
        "startFileProcess: memory record not found for namespace",
      );
    }
    memoryRecordId = args.memoryRecordId;

    await memoryClient.registerStorageSourceMetadata(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as MemoryRecordId<"memoryRecords">,
      contentSource: {
        type: "storage",
        id: args.storageId as string,
      },
      fileName: args.fileName,
      mimeType: args.mimeType,
    });
  } else {
    const mergeResult = await memoryClient.mergeMemory(ctx, {
      namespace: args.namespace,
      key: args.key,
      content: [],
      skipCanonicalText: true,
      ontologyNodeLabel: DEFAULT_FILE_MEMORY_ONTOLOGY_NODE_LABEL,
      contentSource: {
        type: "storage",
        id: args.storageId as string,
      },
      fileName: args.fileName,
      mimeType: args.mimeType,
    });
    memoryRecordId = mergeResult.memoryRecordId as string;

    await memoryClient.registerStorageSourceMetadata(ctx, {
      namespace: args.namespace,
      memoryRecordId:
        mergeResult.memoryRecordId as MemoryRecordId<"memoryRecords">,
      contentSource: {
        type: "storage",
        id: args.storageId as string,
      },
      fileName: args.fileName,
      mimeType: args.mimeType,
    });
  }

  const processId = await ctx.db.insert("fileProcesses", {
    namespace: args.namespace,
    key: args.key,
    storageId: args.storageId,
    mimeType: args.mimeType,
    fileName: args.fileName,
    title: args.title,
    contentHash: args.contentHash,
    memoryRecordId,
    status: "processing",
  });

  return {
    processId,
    memoryRecordId,
    status: "processing" as const,
    scheduledDispatch: true,
  };
}

export async function handleCompleteFileProcess(
  ctx: MutationCtx,
  args: { processId: Id<"fileProcesses"> },
) {
  await ctx.db.patch(args.processId, { status: "completed" });
}

export async function handlePatchIngestProgress(
  ctx: MutationCtx,
  args: {
    processId: Id<"fileProcesses">;
    chunkOrder: number;
    isLast: boolean;
  },
) {
  const patch: {
    lastChunkOrder: number;
    status?: "completed";
  } = { lastChunkOrder: args.chunkOrder };
  if (args.isLast) {
    patch.status = "completed";
  }
  await ctx.db.patch(args.processId, patch);
}
