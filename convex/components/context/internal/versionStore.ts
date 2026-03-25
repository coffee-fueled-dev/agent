import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const insert = internalMutation({
  args: { entryId: v.string(), namespace: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntryVersions", {
      ...args,
      data: { status: "current" },
    });
  },
});

export const markHistorical = internalMutation({
  args: {
    entryId: v.string(),
    replacedByEntryId: v.string(),
    historicalEntryId: v.string(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (!version) return;
    await ctx.db.patch(version._id, {
      entryId: args.historicalEntryId,
      data: {
        status: "historical",
        replacedByEntryId: args.replacedByEntryId,
        replacementTime: Date.now(),
      },
    });
  },
});

export const getByEntryId = internalQuery({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
  },
});
