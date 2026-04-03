import { v } from "convex/values";
import { query } from "../_generated/server.js";

export const getMemoryRecord = query({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
  },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      text: v.optional(v.string()),
      title: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.memoryRecordId);
    if (!doc || doc.namespace !== args.namespace) return null;
    return { key: doc.key, text: doc.text, title: doc.title };
  },
});
