import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

export const getByHash = query({
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
