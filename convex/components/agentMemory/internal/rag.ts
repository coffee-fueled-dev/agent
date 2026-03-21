import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";
import type { ComponentApi as RagComponentApi } from "@convex-dev/rag/_generated/component.js";
import { components } from "../_generated/api";
import { type AgentMemoryGoogleConfig, resolveGoogleApiKey } from "./shared";

const ragComponent = (components as { rag: RagComponentApi<"rag"> }).rag;

export function createAgentMemoryRag(config: AgentMemoryGoogleConfig = {}) {
  const apiKey = resolveGoogleApiKey(config.googleApiKey);
  const google = createGoogleGenerativeAI(apiKey ? { apiKey } : {});

  return new RAG(ragComponent, {
    textEmbeddingModel: google.embedding("gemini-embedding-2-preview"),
    embeddingDimension: 3072,
  });
}
