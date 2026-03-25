import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const insert = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntryEmbeddings", args);
  },
});

export const remove = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

export const get = internalQuery({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    return row?.embedding ?? null;
  },
});

export const updateEntryId = internalMutation({
  args: { oldEntryId: v.string(), newEntryId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.oldEntryId))
      .first();
    if (row) await ctx.db.patch(row._id, { entryId: args.newEntryId });
  },
});
