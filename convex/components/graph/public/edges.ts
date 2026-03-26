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

export const createEdge = mutation({
  args: {
    label: v.string(),
    from: v.string(),
    to: v.string(),
    properties: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const existing = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", args.from).eq("to", args.to),
      )
      .first();
    if (existing) return null;

    const labelRow = await ctx.db
      .query("labels")
      .withIndex("by_value", (q) => q.eq("value", normalized))
      .first();
    if (!labelRow) {
      await ctx.db.insert("labels", {
        value: normalized,
        displayValue: args.label,
      });
    }

    await ctx.db.insert("edges", {
      label: normalized,
      from: args.from,
      to: args.to,
      properties: args.properties,
    });
    return null;
  },
});

export const updateEdge = mutation({
  args: {
    label: v.string(),
    from: v.string(),
    to: v.string(),
    properties: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const edge = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", args.from).eq("to", args.to),
      )
      .first();
    if (!edge) return null;
    await ctx.db.patch(edge._id, { properties: args.properties });
    return null;
  },
});

export const deleteEdge = mutation({
  args: {
    label: v.string(),
    from: v.string(),
    to: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const edge = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", args.from).eq("to", args.to),
      )
      .first();
    if (!edge) return null;
    await ctx.db.delete(edge._id);
    return null;
  },
});

export const queryEdges = query({
  args: {
    label: v.string(),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "edges")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const { from, to } = args;
    if (from != null && to != null) {
      const edge = await ctx.db
        .query("edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", from).eq("to", to),
        )
        .first();
      return {
        page: edge ? [edge] : [],
        isDone: true,
        continueCursor: "",
      };
    }
    if (from != null) {
      return await paginator(ctx.db, schema)
        .query("edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", from),
        )
        .paginate(args.paginationOpts);
    }
    if (to != null) {
      return await paginator(ctx.db, schema)
        .query("edges")
        .withIndex("by_label_to_from", (q) =>
          q.eq("label", normalized).eq("to", to),
        )
        .paginate(args.paginationOpts);
    }
    return await paginator(ctx.db, schema)
      .query("edges")
      .withIndex("by_label_from_to", (q) => q.eq("label", normalized))
      .paginate(args.paginationOpts);
  },
});
