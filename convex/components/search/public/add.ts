import { v } from "convex/values";
import { type MutationCtx, mutation } from "../_generated/server";

export const upsertFeature = mutation({
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
    status: v.union(v.literal("current"), v.literal("historical")),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await ctx.db
      .query("searchFeatures")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .first();

    const value = {
      ...args,
      updatedAt: args.updatedAt ?? Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert("searchFeatures", value);
  },
});

export const deleteFeature = mutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await ctx.db
      .query("searchFeatures")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
