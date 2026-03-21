import { v } from "convex/values";

export const sourceTypes = ["text", "textFile", "binaryFile"] as const;
export type AgentMemorySourceType = (typeof sourceTypes)[number];

export const modalities = [
  "text",
  "image",
  "audio",
  "video",
  "binary",
] as const;
export type AgentMemoryModality = (typeof modalities)[number];

export type AgentMemoryMetadataValue = string | number | boolean | null;
export type AgentMemoryMetadataRecord = Record<
  string,
  AgentMemoryMetadataValue
>;

export type AgentMemoryGoogleConfig = {
  googleApiKey?: string;
};

export type AgentMemoryEntryMetadata = AgentMemoryMetadataRecord & {
  sourceType: AgentMemorySourceType;
  modality: AgentMemoryModality;
  namespace: string;
  mimeType?: string;
  storageId?: string;
  fileName?: string | null;
};

export const metadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export const metadataRecordValidator = v.optional(
  v.record(v.string(), metadataValueValidator),
);

export function resolveGoogleApiKey(googleApiKey?: string) {
  return (
    googleApiKey ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY
  );
}

export function detectModality(mimeType: string): AgentMemoryModality {
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "binary";
}

export function buildEntryMetadata(args: {
  namespace: string;
  sourceType: AgentMemorySourceType;
  modality: AgentMemoryModality;
  metadata?: AgentMemoryMetadataRecord;
  mimeType?: string;
  storageId?: string;
  fileName?: string | null;
}): AgentMemoryEntryMetadata {
  return {
    ...(args.metadata ?? {}),
    namespace: args.namespace,
    sourceType: args.sourceType,
    modality: args.modality,
    ...(args.mimeType ? { mimeType: args.mimeType } : {}),
    ...(args.storageId ? { storageId: args.storageId } : {}),
    ...(args.fileName !== undefined ? { fileName: args.fileName } : {}),
  };
}

export function defaultBinaryRetrievalText(args: {
  fileName?: string;
  mimeType: string;
}) {
  return [args.fileName, args.mimeType].filter(Boolean).join(" ").trim();
}
