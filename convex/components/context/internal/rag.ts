import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";
import type { ComponentApi as RagComponentApi } from "@convex-dev/rag/_generated/component.js";
import { components } from "../_generated/api";

const ragComponent = (components as { rag: RagComponentApi<"rag"> }).rag;

function resolveGoogleApiKey(googleApiKey?: string) {
  return (
    googleApiKey ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY
  );
}

export function createContextRag(googleApiKey?: string) {
  const apiKey = resolveGoogleApiKey(googleApiKey);
  const google = createGoogleGenerativeAI(apiKey ? { apiKey } : {});

  return new RAG(ragComponent, {
    textEmbeddingModel: google.embedding("gemini-embedding-2-preview"),
    embeddingDimension: 3072,
  });
}
