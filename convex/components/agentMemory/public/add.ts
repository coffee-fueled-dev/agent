import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { action, mutation } from "../_generated/server";
import { embedStoredBinaryFile, loadStoredFile } from "../internal/embed";
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
  googleApiKey: v.optional(v.string()),
};

export type AddTextArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  key: string;
  title?: string;
  text: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AddStoredTextFileArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  key: string;
  title?: string;
  storageId: Id<"_storage">;
  mimeType: string;
  fileName?: string;
  metadata?: Record<string, string | number | boolean | null>;
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
        metadata: args.metadata,
      }),
    });
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

export const addStoredBinaryFile = action({
  args: {
    ...sharedAddArgs,
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await loadStoredFile(ctx, args.storageId);
    const bytes = await file.arrayBuffer();
    const contentHash = await contentHashFromArrayBuffer(bytes);
    const chunks = await embedStoredBinaryFile({
      bytes,
      namespace: args.namespace,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
      text: args.text,
      metadata: args.metadata,
      googleApiKey: args.googleApiKey,
    });
    return await createAgentMemoryRag({
      googleApiKey: args.googleApiKey,
    }).add(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      contentHash,
      metadata: buildEntryMetadata({
        namespace: args.namespace,
        sourceType: "binaryFile",
        modality: args.mimeType.startsWith("image/")
          ? "image"
          : args.mimeType.startsWith("audio/")
            ? "audio"
            : args.mimeType.startsWith("video/")
              ? "video"
              : "binary",
        metadata: args.metadata,
        mimeType: args.mimeType,
        storageId: args.storageId,
        fileName: args.fileName ?? null,
      }),
      chunks,
    });
  },
});
