import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";
import { getGoogleApiKey } from "../../env";
import { components } from "./_generated/api";

const ragComponent = components.rag;

function resolveGoogleApiKey(googleApiKey?: string) {
  return googleApiKey ?? getGoogleApiKey();
}

export function createContextRag(googleApiKey?: string) {
  const apiKey = resolveGoogleApiKey(googleApiKey);
  const google = createGoogleGenerativeAI(apiKey ? { apiKey } : {});

  return new RAG<{ status: string }>(ragComponent, {
    textEmbeddingModel: google.embedding("gemini-embedding-2-preview"),
    embeddingDimension: 3072,
    filterNames: ["status"],
  });
}
