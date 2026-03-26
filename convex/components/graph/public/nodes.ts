import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { mutation, query } from "../_generated/server";
import { graphAggregate } from "../internal/aggregate";
import { normalizeLabel } from "../internal/normalize";
import schema from "../schema";

export const createNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const existing = await ctx.db
      .query("nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", normalized).eq("key", args.key),
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

    await ctx.db.insert("nodes", { label: normalized, key: args.key });

    await graphAggregate.insertIfDoesNotExist(ctx, {
      namespace: ["nodes"],
      key: null,
      id: args.key,
    });
    await graphAggregate.insertIfDoesNotExist(ctx, {
      namespace: ["nodes", normalized],
      key: null,
      id: args.key,
    });

    const existingStats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!existingStats) {
      await ctx.db.insert("nodeStats", {
        key: args.key,
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      });
    }

    return null;
  },
});

export const getNode = query({
  args: {
    key: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.union(v.null(), doc(schema, "nodes")),
  handler: async (ctx, args) => {
    if (args.label) {
      const normalized = normalizeLabel(args.label);
      return await ctx.db
        .query("nodes")
        .withIndex("by_label_key", (q) =>
          q.eq("label", normalized).eq("key", args.key),
        )
        .first();
    }
    return await ctx.db
      .query("nodes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

export const deleteNode = mutation({
  args: { label: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const node = await ctx.db
      .query("nodes")
      .withIndex("by_label_key", (q) =>
        q.eq("label", normalized).eq("key", args.key),
      )
      .first();
    if (!node) return null;

    const edges = await ctx.db
      .query("edges")
      .filter((q) =>
        q.or(q.eq(q.field("from"), args.key), q.eq(q.field("to"), args.key)),
      )
      .collect();
    for (const edge of edges) {
      await ctx.db.delete(edge._id);
      await graphAggregate.deleteIfExists(ctx, {
        namespace: ["edges"],
        key: null,
        id: `${edge.label}:${edge.from}:${edge.to}`,
      });
      await graphAggregate.deleteIfExists(ctx, {
        namespace: ["edges", edge.label],
        key: null,
        id: `${edge.label}:${edge.from}:${edge.to}`,
      });
    }

    const stats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (stats) {
      if (stats.totalDegree > 0) {
        await graphAggregate.deleteIfExists(ctx, {
          namespace: ["degree"],
          key: stats.totalDegree,
          id: args.key,
        });
      }
      await ctx.db.delete(stats._id);
    }

    await graphAggregate.deleteIfExists(ctx, {
      namespace: ["nodes"],
      key: null,
      id: args.key,
    });
    await graphAggregate.deleteIfExists(ctx, {
      namespace: ["nodes", normalized],
      key: null,
      id: args.key,
    });

    await ctx.db.delete(node._id);
    return null;
  },
});

export const listNodes = query({
  args: {
    label: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "nodes")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    return await paginator(ctx.db, schema)
      .query("nodes")
      .withIndex("by_label_key", (q) => q.eq("label", normalized))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
