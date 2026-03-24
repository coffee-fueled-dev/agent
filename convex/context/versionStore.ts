import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const insertVersion = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextEntryVersions", {
      ...args,
      data: { status: "current" as const },
      createdAt: Date.now(),
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
    if (version) {
      await ctx.db.patch(version._id, {
        entryId: args.historicalEntryId,
        data: {
          status: "historical" as const,
          replacedByEntryId: args.replacedByEntryId,
          replacedAt: Date.now(),
        },
      });
    }
  },
});

export const getVersionByEntryId = internalQuery({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
  },
});

export const getVersionsByKey = internalQuery({
  args: { namespace: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contextEntryVersions")
      .withIndex("by_namespace_key", (q) =>
        q.eq("namespace", args.namespace).eq("key", args.key),
      )
      .collect();
  },
});
