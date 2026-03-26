import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { mutation, query } from "../_generated/server";
import { normalizeLabel } from "../internal/normalize";
import schema from "../schema";

export const upsertLabel = mutation({
  args: { value: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.value);
    const existing = await ctx.db
      .query("labels")
      .withIndex("by_value", (q) => q.eq("value", normalized))
      .first();
    if (!existing) {
      await ctx.db.insert("labels", {
        value: normalized,
        displayValue: args.value,
      });
    }
    return null;
  },
});

export const getLabel = query({
  args: { value: v.string() },
  returns: v.union(v.null(), doc(schema, "labels")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.value);
    return await ctx.db
      .query("labels")
      .withIndex("by_value", (q) => q.eq("value", normalized))
      .first();
  },
});

export const listLabels = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc(schema, "labels")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("labels")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchLabels = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "labels")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("labels")
      .withSearchIndex("search_displayValue", (q) =>
        q.search("displayValue", args.query),
      )
      .paginate(args.paginationOpts);
  },
});
