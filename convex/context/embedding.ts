import { createPartFromText, GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

function resolveApiKey(apiKey?: string) {
  return (
    apiKey ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY
  );
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

export const insertEmbedding = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntryEmbeddings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export { markStale as markProjectionsStale } from "./projectionStore";
