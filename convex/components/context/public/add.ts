import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const insertEntry = mutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntries", args);
  },
});
