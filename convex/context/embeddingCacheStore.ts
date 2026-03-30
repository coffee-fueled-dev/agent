import { v } from "convex/values";
import { z } from "zod/v4";
import type { Doc } from "../_generated/dataModel";
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

/** Batch read for multi-file attach flows (same order as `contentHashes`). */
export const getByHashes = sessionQuery({
  args: { contentHashes: z.array(z.string()).max(32) },
  handler: async (ctx, args) => {
    const results: (Doc<"embeddingCache"> | null)[] = [];
    for (const contentHash of args.contentHashes) {
      const doc = await ctx.db
        .query("embeddingCache")
        .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
        .first();
      results.push(doc ?? null);
    }
    return results;
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
