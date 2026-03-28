import { v } from "convex/values";
import { z } from "zod/v4";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../customFunctions";

export const getByHash = sessionQuery({
  args: { contentHash: z.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddingCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .first();
  },
});

export const getByHashInternal = internalQuery({
  args: { contentHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddingCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .first();
  },
});

export const cacheEmbedding = internalMutation({
  args: {
    contentHash: v.string(),
    embedding: v.array(v.number()),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("embeddingCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("embeddingCache", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
