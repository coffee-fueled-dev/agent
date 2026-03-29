import { createPartFromText, GoogleGenAI } from "@google/genai";
import { getGoogleApiKey } from "../../../env";

function resolveApiKey(apiKey?: string) {
  return apiKey ?? getGoogleApiKey();
}

export async function embedText(text: string, apiKey?: string) {
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
