import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { sourceValidator, statusValidator } from "../schema";

export const upsertFeature = mutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
    sourceSystem: v.string(),
    source: sourceValidator,
    title: v.optional(v.string()),
    text: v.string(),
    status: statusValidator,
    updatedAt: v.optional(v.number()),
  },
  returns: v.id("searchFeatures"),
  handler: async (ctx, args) => {
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
  returns: v.null(),
  handler: async (ctx, args) => {
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
