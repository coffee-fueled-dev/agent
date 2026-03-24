import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const insertEntry = mutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    legacyEntryId: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntries", args);
  },
});

export const deleteEntry = mutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("contextEntries")
      .withIndex("by_namespace_createdAt", (q) =>
        q.eq("namespace", args.namespace),
      )
      .filter((q) => q.eq(q.field("entryId"), args.entryId))
      .first();
    if (entry) await ctx.db.delete(entry._id);
  },
});
