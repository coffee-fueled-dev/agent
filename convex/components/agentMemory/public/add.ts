import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action, mutation } from "../_generated/server";
import { loadStoredFile } from "../internal/embed";
import { createAgentMemoryRag } from "../internal/rag";
import {
  type AgentMemoryGoogleConfig,
  buildEntryMetadata,
  metadataRecordValidator,
} from "../internal/shared";

const sharedAddArgs = {
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
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
  googleApiKey: v.optional(v.string()),
};

export async function addTextEntry(ctx: ActionCtx, args: AddTextArgs) {
  return await createAgentMemoryRag({
    googleApiKey: args.googleApiKey,
  }).add(ctx, {
    namespace: args.namespace,
    key: args.key,
    title: args.title,
    text: args.text,
    metadata: buildEntryMetadata({
      namespace: args.namespace,
      sourceType: "text",
      modality: "text",
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
      metadata: args.metadata,
    }),
  });
}

export type AddTextArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  key: string;
  title?: string;
  text: string;
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
};

export type AddStoredTextFileArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  key: string;
  title?: string;
  storageId: Id<"_storage">;
  mimeType: string;
  fileName?: string;
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
};

export type AddStoredBinaryFileArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  key: string;
  title?: string;
  storageId: Id<"_storage">;
  mimeType: string;
  fileName?: string;
  text?: string;
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
};

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addText = action({
  args: {
    ...sharedAddArgs,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await addTextEntry(ctx, args);
  },
});

export const addStoredTextFile = action({
  args: {
    ...sharedAddArgs,
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await loadStoredFile(ctx, args.storageId);
    const bytes = await file.arrayBuffer();
    const contentHash = await contentHashFromArrayBuffer(bytes);
    const text = new TextDecoder().decode(bytes);
    const metadata = buildEntryMetadata({
      namespace: args.namespace,
      sourceType: "textFile",
      modality: "text",
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
      metadata: args.metadata,
      mimeType: args.mimeType,
      storageId: args.storageId,
      fileName: args.fileName ?? null,
    });
    return await createAgentMemoryRag({
      googleApiKey: args.googleApiKey,
    }).add(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      contentHash,
      metadata,
      text,
    });
  },
});

