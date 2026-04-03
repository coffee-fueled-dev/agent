import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function createEmbeddingModel(googleApiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

  return google.embedding("gemini-embedding-2-preview");
}
