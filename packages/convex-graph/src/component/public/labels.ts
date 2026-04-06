import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { mutation, query } from "../_generated/server.js";
import { normalizeLabel } from "../internal/normalize.js";
import schema from "../schema.js";

export const upsertLabel = mutation({
  args: {
    value: v.string(),
    type: v.union(v.literal("node"), v.literal("edge")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.value);
    const existing = await ctx.db
      .query("graph_labels")
      .withIndex("by_type_value", (q) =>
        q.eq("type", args.type).eq("value", normalized),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("graph_labels", {
        value: normalized,
        displayValue: args.value,
        type: args.type,
      });
    }
    return null;
  },
});

export const getLabel = query({
  args: {
    value: v.string(),
    type: v.union(v.literal("node"), v.literal("edge")),
  },
  returns: v.union(v.null(), doc(schema, "graph_labels")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.value);
    return await ctx.db
      .query("graph_labels")
      .withIndex("by_type_value", (q) =>
        q.eq("type", args.type).eq("value", normalized),
      )
      .first();
  },
});

export const listLabels = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc(schema, "graph_labels")),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("graph_labels")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
