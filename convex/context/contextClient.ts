import { components } from "../_generated/api";
import { ContextClient } from "../components/context/client";

export function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export function getEmbeddingServerUrl() {
  return process.env.EMBEDDING_SERVER_URL?.trim() || "http://127.0.0.1:3031";
}

export function getFileEmbeddingSecret() {
  return (
    process.env.BINARY_EMBEDDING_SECRET?.trim() ||
    "dev-only-binary-embedding-secret"
  );
}

export function getConvexSiteUrl() {
  const url =
    process.env.CONVEX_SITE_URL?.trim() || process.env.CONVEX_URL?.trim();
  if (!url) throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
  return url.replace(/\/+$/, "");
}
