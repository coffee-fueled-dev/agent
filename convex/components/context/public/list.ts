import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { internalQuery, query } from "../_generated/server";
import schema from "../schema";

export const listEntries = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "contextEntries")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("contextEntries")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getEntryByLegacyId = internalQuery({
  args: {
    namespace: v.string(),
    legacyEntryId: v.string(),
  },
  returns: v.union(v.null(), doc(schema, "contextEntries")),
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
