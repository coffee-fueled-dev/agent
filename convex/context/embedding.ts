import { createPartFromText, GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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

export const deleteEmbedding = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const embedding = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (embedding) await ctx.db.delete(embedding._id);
  },
});

export const getEmbedding = internalQuery({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    return row?.embedding ?? null;
  },
});

export const updateEmbeddingEntryId = internalMutation({
  args: { oldEntryId: v.string(), newEntryId: v.string() },
  handler: async (ctx, args) => {
    const embedding = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.oldEntryId))
      .first();
    if (embedding) {
      await ctx.db.patch(embedding._id, { entryId: args.newEntryId });
    }
  },
});

export { markStale as markProjectionsStale } from "./projectionStore";
