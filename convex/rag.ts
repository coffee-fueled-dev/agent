import { google } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: google.embedding("gemini-embedding-2-preview"),
  embeddingDimension: 3072,
});
