import { v } from "convex/values";
import { withoutSystemFields } from "convex-helpers";
import { doc } from "convex-helpers/validators";
import { internalMutation, internalQuery } from "../_generated/server";
import schema, { sourceValidator } from "../schema";

export const insertEntry = internalMutation({
  args: withoutSystemFields(doc(schema, "contextEntries").fields),
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("contextEntries", args);
  },
});

/** Batch-load `source` + `textPreview` for search result enrichment (same order as `entryIds`). */
export const getEntriesSourceBatch = internalQuery({
  args: {
    namespace: v.string(),
    entryIds: v.array(v.string()),
  },
  returns: v.array(
    v.union(
      v.null(),
      v.object({
        entryId: v.string(),
        source: sourceValidator,
        textPreview: v.string(),
      }),
    ),
  ),
  handler: async (ctx, args) => {
    const results = [];
    for (const entryId of args.entryIds) {
      const row = await ctx.db
        .query("contextEntries")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (!row || row.namespace !== args.namespace) {
        results.push(null);
        continue;
      }
      results.push({
        entryId: row.entryId,
        source: row.source,
        textPreview: row.textPreview,
      });
    }
    return results;
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
