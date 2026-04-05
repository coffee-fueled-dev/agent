import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { query } from "../_generated/server.js";
import schema from "../schema.js";

const leanMemoryRecordValidator = v.object({
  _id: v.id("memoryRecords"),
  _creationTime: v.number(),
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
});

export const listMemoryRecordsPaginated = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(leanMemoryRecordValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const raw = await paginator(ctx.db, schema)
      .query("memoryRecords")
      .withIndex("by_namespace_key", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...raw,
      continueCursor: raw.continueCursor ?? "",
      page: raw.page.map((d) => ({
        _id: d._id,
        _creationTime: d._creationTime,
        namespace: d.namespace,
        key: d.key,
        title: d.title,
      })),
    };
  },
});

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
