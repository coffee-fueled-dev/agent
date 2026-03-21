import {
  createPartFromBase64,
  createPartFromText,
  GoogleGenAI,
} from "@google/genai";
import type { Id } from "../_generated/dataModel";
import {
  type AgentMemoryEntryMetadata,
  type AgentMemoryGoogleConfig,
  type AgentMemoryMetadataRecord,
  buildEntryMetadata,
  defaultBinaryRetrievalText,
  detectModality,
  resolveGoogleApiKey,
} from "./shared";

const geminiEmbeddingModel = "gemini-embedding-2-preview";

function createGenAIClient(googleApiKey?: string) {
  const apiKey = resolveGoogleApiKey(googleApiKey);
  return new GoogleGenAI(apiKey ? { apiKey } : {});
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function loadStoredFile(
  ctx: {
    storage: {
      get(storageId: Id<"_storage">): Promise<Blob | null>;
    };
  },
  storageId: Id<"_storage">,
) {
  const file = await ctx.storage.get(storageId);
  if (!file) {
    throw new Error(`Stored file ${storageId} was not found`);
  }
  return file;
}

export async function embedStoredBinaryFile(
  args: {
    bytes: ArrayBuffer;
    namespace: string;
    storageId: Id<"_storage">;
    mimeType: string;
    fileName?: string;
    text?: string;
    metadata?: AgentMemoryMetadataRecord;
  } & AgentMemoryGoogleConfig,
) {
  const fileBytes = arrayBufferToBase64(args.bytes);
  const retrievalText =
    args.text?.trim() ||
    defaultBinaryRetrievalText({
      fileName: args.fileName,
      mimeType: args.mimeType,
    }) ||
    "binary file";
  const metadata = buildEntryMetadata({
    namespace: args.namespace,
    sourceType: "binaryFile",
    modality: detectModality(args.mimeType),
    metadata: args.metadata,
    mimeType: args.mimeType,
    storageId: args.storageId,
    fileName: args.fileName ?? null,
  });
  const response = await createGenAIClient(
    args.googleApiKey,
  ).models.embedContent({
    model: geminiEmbeddingModel,
    contents: [
      createPartFromBase64(fileBytes, args.mimeType),
      createPartFromText(retrievalText),
    ],
  });
  return geminiEmbeddingsToRagChunks(response.embeddings, {
    text: retrievalText,
    metadata,
  });
}

export async function embedTextVector(
  args: {
    text: string;
  } & AgentMemoryGoogleConfig,
) {
  const response = await createGenAIClient(
    args.googleApiKey,
  ).models.embedContent({
    model: geminiEmbeddingModel,
    contents: [createPartFromText(args.text)],
  });
  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Failed to embed text for memory charting");
  }
  return values;
}

export function* geminiEmbeddingsToRagChunks(
  embeddings:
    | Array<{
        values?: number[];
      } | null>
    | null
    | undefined,
  source: {
    text: string;
    metadata: AgentMemoryEntryMetadata;
  },
) {
  for (const embedding of embeddings ?? []) {
    if (!embedding?.values?.length) {
      continue;
    }
    yield {
      text: source.text,
      metadata: source.metadata,
      embedding: embedding.values,
    };
  }
}
