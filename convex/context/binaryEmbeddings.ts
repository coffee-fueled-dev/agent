import { action, internalAction, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { createAgentMemoryRag } from "../components/agentMemory/internal/rag";
import type { AgentMemorySearchResult } from "../components/agentMemory/public/search";
import {
  binaryEmbeddingCompletionArgs,
  binaryEmbeddingFailureArgs,
  binaryEmbeddingProcessArgs,
  buildBinaryMemoryMetadata,
  enqueueBinaryMemoryChartSidecar,
  getBinaryEmbeddingSecret,
  getEmbeddingServerUrl,
} from "./shared";

type BinaryEmbeddingDispatchResult = {
  processId: string;
  status: "dispatched";
};

type BinaryEmbeddingCompletionResult = {
  entryId: string;
  processId: string;
  status: "completed";
};

function normalizeServerUrl(value: string) {
  return value.replace(/\/+$/, "");
}

async function dispatchBinaryEmbeddingJob(args: {
  processId: string;
  fileUrl: string;
  namespace: string;
  title?: string;
  text?: string;
  mimeType: string;
  fileName?: string | null;
}) {
  const response = await fetch(`${normalizeServerUrl(getEmbeddingServerUrl())}/embed`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-binary-embedding-secret": getBinaryEmbeddingSecret(),
    },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(
      `Embedding server rejected the job (${response.status} ${response.statusText})`,
    );
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addStoredBinaryFile = action({
  args: binaryEmbeddingProcessArgs,
  handler: async (ctx, args): Promise<BinaryEmbeddingDispatchResult> => {
    const processId = await ctx.runMutation(
      internal.context.binaryEmbeddingStore.createBinaryEmbeddingProcess,
      args,
    );
    try {
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) {
        throw new Error(`Stored file ${args.storageId} could not be resolved`);
      }
      await dispatchBinaryEmbeddingJob({
        processId,
        fileUrl,
        namespace: args.namespace,
        title: args.title,
        text: args.text,
        mimeType: args.mimeType,
        fileName: args.fileName ?? null,
      });
      await ctx.runMutation(
        internal.context.binaryEmbeddingStore.markBinaryEmbeddingProcessDispatched,
        { processId },
      );
      return {
        processId,
        status: "dispatched",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to dispatch embedding job";
      await ctx.runMutation(
        internal.context.binaryEmbeddingStore.markBinaryEmbeddingProcessFailed,
        {
          processId,
          error: message,
        },
      );
      throw error;
    }
  },
});

export const completeBinaryEmbeddingProcess = internalAction({
  args: binaryEmbeddingCompletionArgs,
  handler: async (ctx, args): Promise<BinaryEmbeddingCompletionResult> => {
    const process = await ctx.runQuery(
      internal.context.binaryEmbeddingStore.getBinaryEmbeddingProcess,
      { processId: args.processId },
    );
    if (!process) {
      throw new Error(`Binary embedding process ${args.processId} was not found`);
    }
    if (process.entryId) {
      return {
        entryId: process.entryId,
        processId: args.processId,
        status: "completed",
      };
    }
    const result = await createAgentMemoryRag().add(ctx, {
      namespace: process.namespace,
      key: process.key,
      title: process.title,
      metadata: buildBinaryMemoryMetadata({
        namespace: process.namespace,
        mimeType: process.mimeType,
        storageId: process.storageId,
        fileName: process.fileName ?? null,
        metadata: process.metadata,
        indexKind: process.indexKind,
        sourceKind: process.sourceKind,
        streamType: process.streamType,
        streamId: process.streamId,
        sourceEntryId: process.sourceEntryId,
        entity: process.entity,
        entityType: process.entityType,
        sourceVersion: process.sourceVersion,
        entryTime: process.entryTime,
        validFrom: process.validFrom,
        validTo: process.validTo,
        scope: process.scope,
      }),
      chunks: args.chunks,
    });
    await ctx.runMutation(
      internal.context.binaryEmbeddingStore.markBinaryEmbeddingProcessCompleted,
      {
        processId: args.processId,
        entryId: result.entryId,
        retrievalText: args.retrievalText,
      },
    );
    try {
      await enqueueBinaryMemoryChartSidecar(ctx, {
        namespace: process.namespace,
        entryId: result.entryId,
        key: process.key,
        title: process.title,
        retrievalText: args.retrievalText,
        sourceKind: process.sourceKind,
        storageId: process.storageId,
        mimeType: process.mimeType,
        fileName: process.fileName ?? null,
        metadata: process.metadata,
        entryTime: process.entryTime,
      });
    } catch (error) {
      console.error("Failed to enqueue binary memory chart update", error);
    }
    return {
      entryId: result.entryId,
      processId: args.processId,
      status: "completed",
    };
  },
});

export const failBinaryEmbeddingProcess = internalAction({
  args: binaryEmbeddingFailureArgs,
  handler: async (ctx, args) => {
    await ctx.runMutation(
      internal.context.binaryEmbeddingStore.markBinaryEmbeddingProcessFailed,
      args,
    );
    return null;
  },
});
