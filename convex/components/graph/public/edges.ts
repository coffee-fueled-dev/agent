import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  type GraphAggregateNamespace,
  graphAggregate,
} from "../internal/aggregate";
import { normalizeLabel } from "../internal/normalize";
import schema from "../schema";

function edgeId(label: string, from: string, to: string) {
  return `${label}:${from}:${to}`;
}

async function updateDegreeAggregate(
  ctx: MutationCtx,
  args: {
    nodeKey: string;
    oldDegree: number;
    newDegree: number;
    edgeLabel: string;
  },
) {
  const namespaces: GraphAggregateNamespace[] = [
    ["degree"],
    ["degree", args.edgeLabel],
  ];
  for (const namespace of namespaces) {
    if (args.oldDegree > 0) {
      await graphAggregate.deleteIfExists(ctx, {
        namespace,
        key: args.oldDegree,
        id: args.nodeKey,
      });
    }
    if (args.newDegree > 0) {
      await graphAggregate.insertIfDoesNotExist(ctx, {
        namespace,
        key: args.newDegree,
        id: args.nodeKey,
        sumValue: args.newDegree,
      });
    }
  }
}

async function getOrCreateNodeStats(ctx: MutationCtx, key: string) {
  const existing = await ctx.db
    .query("nodeStats")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("nodeStats", {
    key,
    inDegree: 0,
    outDegree: 0,
    totalDegree: 0,
  });
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Failed to read freshly inserted nodeStats");
  return doc;
}

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

    const id = edgeId(normalized, args.from, args.to);
    await graphAggregate.insertIfDoesNotExist(ctx, {
      namespace: ["edges"],
      key: null,
      id,
    });
    await graphAggregate.insertIfDoesNotExist(ctx, {
      namespace: ["edges", normalized],
      key: null,
      id,
    });

    const fromStats = await getOrCreateNodeStats(ctx, args.from);
    const newOutDegree = fromStats.outDegree + 1;
    const newFromTotal = fromStats.totalDegree + 1;
    await ctx.db.patch(fromStats._id, {
      outDegree: newOutDegree,
      totalDegree: newFromTotal,
    });
    await updateDegreeAggregate(ctx, {
      nodeKey: args.from,
      oldDegree: fromStats.totalDegree,
      newDegree: newFromTotal,
      edgeLabel: normalized,
    });

    const toStats = await getOrCreateNodeStats(ctx, args.to);
    const newInDegree = toStats.inDegree + 1;
    const newToTotal = toStats.totalDegree + 1;
    await ctx.db.patch(toStats._id, {
      inDegree: newInDegree,
      totalDegree: newToTotal,
    });
    await updateDegreeAggregate(ctx, {
      nodeKey: args.to,
      oldDegree: toStats.totalDegree,
      newDegree: newToTotal,
      edgeLabel: normalized,
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

    const id = edgeId(normalized, args.from, args.to);
    await graphAggregate.deleteIfExists(ctx, {
      namespace: ["edges"],
      key: null,
      id,
    });
    await graphAggregate.deleteIfExists(ctx, {
      namespace: ["edges", normalized],
      key: null,
      id,
    });

    const fromStats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.from))
      .first();
    if (fromStats) {
      const newOutDegree = Math.max(0, fromStats.outDegree - 1);
      const newFromTotal = Math.max(0, fromStats.totalDegree - 1);
      await ctx.db.patch(fromStats._id, {
        outDegree: newOutDegree,
        totalDegree: newFromTotal,
      });
      await updateDegreeAggregate(ctx, {
        nodeKey: args.from,
        oldDegree: fromStats.totalDegree,
        newDegree: newFromTotal,
        edgeLabel: normalized,
      });
    }

    const toStats = await ctx.db
      .query("nodeStats")
      .withIndex("by_key", (q) => q.eq("key", args.to))
      .first();
    if (toStats) {
      const newInDegree = Math.max(0, toStats.inDegree - 1);
      const newToTotal = Math.max(0, toStats.totalDegree - 1);
      await ctx.db.patch(toStats._id, {
        inDegree: newInDegree,
        totalDegree: newToTotal,
      });
      await updateDegreeAggregate(ctx, {
        nodeKey: args.to,
        oldDegree: toStats.totalDegree,
        newDegree: newToTotal,
        edgeLabel: normalized,
      });
    }

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
