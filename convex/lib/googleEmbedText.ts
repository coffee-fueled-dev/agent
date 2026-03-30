import { createPartFromText, GoogleGenAI } from "@google/genai";
import { getGoogleApiKey } from "../env";

function resolveApiKey(apiKey?: string) {
  return apiKey ?? getGoogleApiKey();
}

/** Same model as [`convex/components/context/internal/embedding.ts`](../components/context/internal/embedding.ts). */
export async function embedText(
  text: string,
  apiKey?: string,
): Promise<number[]> {
  const key = resolveApiKey(apiKey);
  const client = new GoogleGenAI(key ? { apiKey: key } : {});
  const response = await client.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: [createPartFromText(text)],
  });
  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Failed to embed text");
  return values;
}

/** Align with telemetry `isTextLikeFile` — textual MIME must use text embedding, not file API. */
export function isTextLikeMime(mimeType: string): boolean {
  const m = mimeType.toLowerCase();
  return (
    m.startsWith("text/") || m === "application/json" || m === "application/xml"
  );
}

/** Cap for Convex action memory; enough for a single query embedding. */
export const EMBED_FOR_SEARCH_TEXT_MAX = 8192;
