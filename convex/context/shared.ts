import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  buildEntryMetadata,
  defaultBinaryRetrievalText,
  detectModality,
  metadataRecordValidator,
} from "../components/agentMemory/internal/shared";

export const binaryEmbeddingProcessArgs = {
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  text: v.optional(v.string()),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileName: v.optional(v.string()),
  metadata: metadataRecordValidator,
  indexKind: v.optional(v.union(v.literal("current"), v.literal("historical"))),
  sourceKind: v.optional(v.string()),
  streamType: v.optional(v.string()),
  streamId: v.optional(v.string()),
  sourceEntryId: v.optional(v.string()),
  entity: v.optional(v.string()),
  entityType: v.optional(v.string()),
  sourceVersion: v.optional(v.number()),
  entryTime: v.optional(v.number()),
  validFrom: v.optional(v.number()),
  validTo: v.optional(v.union(v.number(), v.null())),
  scope: v.optional(v.string()),
};

export const binaryEmbeddingChunkValidator = v.object({
  text: v.string(),
  embedding: v.array(v.number()),
});

export const binaryEmbeddingCompletionArgs = {
  processId: v.id("binaryEmbeddingProcesses"),
  retrievalText: v.string(),
  chunks: v.array(binaryEmbeddingChunkValidator),
};

export const binaryEmbeddingFailureArgs = {
  processId: v.id("binaryEmbeddingProcesses"),
  error: v.string(),
};

export function getEmbeddingServerUrl() {
  return process.env.EMBEDDING_SERVER_URL?.trim() || "http://127.0.0.1:3031";
}

export function getBinaryEmbeddingSecret() {
  return (
    process.env.BINARY_EMBEDDING_SECRET?.trim() ||
    "dev-only-binary-embedding-secret"
  );
}

export function buildBinaryRetrievalText(args: {
  text?: string;
  title?: string;
  fileName?: string | null;
  mimeType: string;
}) {
  const text = args.text?.trim();
  if (text) {
    return text;
  }
  const titled = [args.title, args.fileName, args.mimeType]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    titled ||
    defaultBinaryRetrievalText({
      fileName: args.fileName ?? undefined,
      mimeType: args.mimeType,
    }) ||
    "binary file"
  );
}

export function buildBinaryMemoryMetadata(args: {
  namespace: string;
  mimeType: string;
  storageId: string;
  fileName?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  indexKind?: "current" | "historical";
  sourceKind?: string;
  streamType?: string;
  streamId?: string;
  sourceEntryId?: string;
  entity?: string;
  entityType?: string;
  sourceVersion?: number;
  entryTime?: number;
  validFrom?: number;
  validTo?: number | null;
  scope?: string;
}) {
  return buildEntryMetadata({
    namespace: args.namespace,
    sourceType: "binaryFile",
    modality: detectModality(args.mimeType),
    metadata: args.metadata,
    indexKind: args.indexKind,
    sourceKind: args.sourceKind,
    streamType: args.streamType,
    streamId: args.streamId,
    sourceEntryId: args.sourceEntryId,
    entity: args.entity,
    entityType: args.entityType,
    sourceVersion: args.sourceVersion,
    entryTime: args.entryTime,
    validFrom: args.validFrom,
    validTo: args.validTo,
    scope: args.scope,
    mimeType: args.mimeType,
    storageId: args.storageId,
    fileName: args.fileName ?? null,
  });
}

function compactSummary(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shorten(value: string, max = 280) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

export async function enqueueBinaryMemoryChartSidecar(
  ctx: Pick<ActionCtx, "runMutation">,
  args: {
    namespace: string;
    entryId: string;
    key: string;
    title?: string;
    retrievalText: string;
    sourceKind?: string;
    storageId: string;
    mimeType: string;
    fileName?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
    entryTime?: number;
  },
) {
  const chartText = compactSummary(args.retrievalText);
  if (!chartText) {
    return;
  }
  await ctx.runMutation(internal.agentMemory.enqueueMemoryChartUpdate, {
    namespace: args.namespace,
    entryId: args.entryId,
    key: args.key,
    title: args.title,
    summary: shorten(chartText),
    chartText: shorten(chartText, 4_000),
    sourceType: "binaryFile",
    sourceKind: args.sourceKind,
    storageId: args.storageId,
    mimeType: args.mimeType,
    fileName: args.fileName,
    metadata: args.metadata,
    entryTime: args.entryTime ?? Date.now(),
  });
}
