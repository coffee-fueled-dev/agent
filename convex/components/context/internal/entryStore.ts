import { v } from "convex/values";
import { withoutSystemFields } from "convex-helpers";
import { doc } from "convex-helpers/validators";
import { internalMutation } from "../_generated/server";
import schema from "../schema";

export const insertEntry = internalMutation({
  args: withoutSystemFields(doc(schema, "contextEntries").fields),
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntries", args);
  },
});

export const deleteEntry = internalMutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("contextEntries")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .filter((q) => q.eq(q.field("entryId"), args.entryId))
      .first();
    if (entry) await ctx.db.delete(entry._id);
  },
});
