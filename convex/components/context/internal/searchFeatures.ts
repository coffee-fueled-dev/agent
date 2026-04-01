import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { search } from "../search";

export const upsertSearchFeature = internalMutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
    sourceSystem: v.string(),
    source: v.union(
      v.object({
        kind: v.literal("document"),
        document: v.string(),
        documentId: v.string(),
        entryId: v.string(),
        key: v.string(),
        sourceType: v.union(v.literal("text"), v.literal("binary")),
      }),
      v.object({
        kind: v.literal("content"),
        contentId: v.string(),
        sourceType: v.union(v.literal("text"), v.literal("binary")),
      }),
    ),
    title: v.optional(v.string()),
    text: v.string(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await search.upsertFeature(ctx, args);
  },
});

export const deleteSearchFeature = internalMutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
  },
  handler: async (ctx, args) => {
    return await search.deleteFeature(ctx, args);
  },
});

export const searchFeatures = internalQuery({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    sourceSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await search.search(ctx, args);
  },
});
