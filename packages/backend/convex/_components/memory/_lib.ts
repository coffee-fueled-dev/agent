import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getGoogleApiKey } from "./env";

function resolveGoogleApiKey(googleApiKey?: string) {
  return googleApiKey ?? getGoogleApiKey();
}

export function createEmbeddingModel(googleApiKey?: string) {
  const apiKey = resolveGoogleApiKey(googleApiKey);
  const google = createGoogleGenerativeAI(apiKey ? { apiKey } : {});

  return google.embedding("gemini-embedding-2-preview");
}
