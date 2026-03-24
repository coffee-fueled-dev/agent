import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { query } from "../_generated/server";
import schema from "../schema";

export const listEntries = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextEntries")
      .withIndex("by_namespace_createdAt", (q) =>
        q.eq("namespace", args.namespace),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getEntryByLegacyId = query({
  args: {
    namespace: v.string(),
    legacyEntryId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("contextEntries")
      .withIndex("by_legacyEntryId", (q) =>
        q.eq("legacyEntryId", args.legacyEntryId),
      )
      .first();
    if (!entry || entry.namespace !== args.namespace) return null;
    return entry;
  },
});
