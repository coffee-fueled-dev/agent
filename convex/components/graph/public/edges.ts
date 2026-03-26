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
  graphAggregate,
  type GraphAggregateNamespace,
} from "../internal/aggregate";
import { canonicalPair } from "../internal/canonical";
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
  const row = await ctx.db.get(id);
  if (!row) throw new Error("Failed to read freshly inserted nodeStats");
  return row;
}

export const createEdge = mutation({
  args: {
    label: v.string(),
    from: v.string(),
    to: v.string(),
    directed: v.optional(v.boolean()),
    properties: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const isDirected = args.directed !== false;
    const [from, to] = isDirected
      ? [args.from, args.to]
      : canonicalPair(args.from, args.to);

    const existing = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", from).eq("to", to),
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
      from,
      to,
      directed: isDirected,
      properties: args.properties,
    });

    const id = edgeId(normalized, from, to);
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

    if (isDirected) {
      const fromStats = await getOrCreateNodeStats(ctx, from);
      await ctx.db.patch(fromStats._id, {
        outDegree: fromStats.outDegree + 1,
        totalDegree: fromStats.totalDegree + 1,
      });
      await updateDegreeAggregate(ctx, {
        nodeKey: from,
        oldDegree: fromStats.totalDegree,
        newDegree: fromStats.totalDegree + 1,
        edgeLabel: normalized,
      });

      const toStats = await getOrCreateNodeStats(ctx, to);
      await ctx.db.patch(toStats._id, {
        inDegree: toStats.inDegree + 1,
        totalDegree: toStats.totalDegree + 1,
      });
      await updateDegreeAggregate(ctx, {
        nodeKey: to,
        oldDegree: toStats.totalDegree,
        newDegree: toStats.totalDegree + 1,
        edgeLabel: normalized,
      });
    } else {
      // Undirected: both nodes get +1 totalDegree, no in/out distinction
      const fromStats = await getOrCreateNodeStats(ctx, from);
      await ctx.db.patch(fromStats._id, {
        totalDegree: fromStats.totalDegree + 1,
      });
      await updateDegreeAggregate(ctx, {
        nodeKey: from,
        oldDegree: fromStats.totalDegree,
        newDegree: fromStats.totalDegree + 1,
        edgeLabel: normalized,
      });

      if (from !== to) {
        const toStats = await getOrCreateNodeStats(ctx, to);
        await ctx.db.patch(toStats._id, {
          totalDegree: toStats.totalDegree + 1,
        });
        await updateDegreeAggregate(ctx, {
          nodeKey: to,
          oldDegree: toStats.totalDegree,
          newDegree: toStats.totalDegree + 1,
          edgeLabel: normalized,
        });
      }
    }

    return null;
  },
});

export const updateEdge = mutation({
  args: {
    label: v.string(),
    from: v.string(),
    to: v.string(),
    directed: v.optional(v.boolean()),
    properties: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const isDirected = args.directed !== false;
    const [from, to] = isDirected
      ? [args.from, args.to]
      : canonicalPair(args.from, args.to);

    const edge = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", from).eq("to", to),
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
    directed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const isDirected = args.directed !== false;
    const [from, to] = isDirected
      ? [args.from, args.to]
      : canonicalPair(args.from, args.to);

    const edge = await ctx.db
      .query("edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", from).eq("to", to),
      )
      .first();
    if (!edge) return null;
    await ctx.db.delete(edge._id);

    const id = edgeId(normalized, from, to);
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

    if (edge.directed) {
      const fromStats = await ctx.db
        .query("nodeStats")
        .withIndex("by_key", (q) => q.eq("key", from))
        .first();
      if (fromStats) {
        const newOut = Math.max(0, fromStats.outDegree - 1);
        const newTotal = Math.max(0, fromStats.totalDegree - 1);
        await ctx.db.patch(fromStats._id, {
          outDegree: newOut,
          totalDegree: newTotal,
        });
        await updateDegreeAggregate(ctx, {
          nodeKey: from,
          oldDegree: fromStats.totalDegree,
          newDegree: newTotal,
          edgeLabel: normalized,
        });
      }

      const toStats = await ctx.db
        .query("nodeStats")
        .withIndex("by_key", (q) => q.eq("key", to))
        .first();
      if (toStats) {
        const newIn = Math.max(0, toStats.inDegree - 1);
        const newTotal = Math.max(0, toStats.totalDegree - 1);
        await ctx.db.patch(toStats._id, {
          inDegree: newIn,
          totalDegree: newTotal,
        });
        await updateDegreeAggregate(ctx, {
          nodeKey: to,
          oldDegree: toStats.totalDegree,
          newDegree: newTotal,
          edgeLabel: normalized,
        });
      }
    } else {
      const fromStats = await ctx.db
        .query("nodeStats")
        .withIndex("by_key", (q) => q.eq("key", from))
        .first();
      if (fromStats) {
        const newTotal = Math.max(0, fromStats.totalDegree - 1);
        await ctx.db.patch(fromStats._id, { totalDegree: newTotal });
        await updateDegreeAggregate(ctx, {
          nodeKey: from,
          oldDegree: fromStats.totalDegree,
          newDegree: newTotal,
          edgeLabel: normalized,
        });
      }

      if (from !== to) {
        const toStats = await ctx.db
          .query("nodeStats")
          .withIndex("by_key", (q) => q.eq("key", to))
          .first();
        if (toStats) {
          const newTotal = Math.max(0, toStats.totalDegree - 1);
          await ctx.db.patch(toStats._id, { totalDegree: newTotal });
          await updateDegreeAggregate(ctx, {
            nodeKey: to,
            oldDegree: toStats.totalDegree,
            newDegree: newTotal,
            edgeLabel: normalized,
          });
        }
      }
    }

    return null;
  },
});

export const queryEdges = query({
  args: {
    label: v.string(),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    node: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "edges")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const { from, to, node } = args;

    // Neighbors mode: find all edges touching a node in either direction
    if (node != null) {
      const [outgoing, incoming] = await Promise.all([
        ctx.db
          .query("edges")
          .withIndex("by_label_from_to", (q) =>
            q.eq("label", normalized).eq("from", node),
          )
          .collect(),
        ctx.db
          .query("edges")
          .withIndex("by_label_to_from", (q) =>
            q.eq("label", normalized).eq("to", node),
          )
          .collect(),
      ]);
      // Dedup (for self-edges the same row appears in both)
      const seen = new Set<string>();
      const merged = [];
      for (const edge of [...outgoing, ...incoming]) {
        const id = edge._id.toString();
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(edge);
        }
      }
      return { page: merged, isDone: true, continueCursor: "" };
    }

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

export const createEdgesBatch = mutation({
  args: {
    label: v.string(),
    directed: v.optional(v.boolean()),
    edges: v.array(
      v.object({
        from: v.string(),
        to: v.string(),
        properties: v.optional(v.any()),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const isDirected = args.directed !== false;

    const labelRow = await ctx.db
      .query("labels")
      .withIndex("by_value", (q) => q.eq("value", normalized))
      .first();
    if (!labelRow) {
      await ctx.db.insert("labels", { value: normalized, displayValue: args.label });
    }

    const degreeDeltas = new Map<string, number>();
    let created = 0;

    for (const e of args.edges) {
      const [from, to] = isDirected ? [e.from, e.to] : canonicalPair(e.from, e.to);

      const existing = await ctx.db
        .query("edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", from).eq("to", to),
        )
        .first();
      if (existing) continue;

      await ctx.db.insert("edges", {
        label: normalized,
        from,
        to,
        directed: isDirected,
        properties: e.properties,
      });

      const id = edgeId(normalized, from, to);
      await graphAggregate.insertIfDoesNotExist(ctx, { namespace: ["edges"], key: null, id });
      await graphAggregate.insertIfDoesNotExist(ctx, { namespace: ["edges", normalized], key: null, id });

      degreeDeltas.set(from, (degreeDeltas.get(from) ?? 0) + 1);
      if (from !== to) {
        degreeDeltas.set(to, (degreeDeltas.get(to) ?? 0) + 1);
      }
      created++;
    }

    for (const [nodeKey, delta] of degreeDeltas) {
      const stats = await getOrCreateNodeStats(ctx, nodeKey);
      const oldDegree = stats.totalDegree;
      const newDegree = oldDegree + delta;
      await ctx.db.patch(stats._id, { totalDegree: newDegree });
      await updateDegreeAggregate(ctx, { nodeKey, oldDegree, newDegree, edgeLabel: normalized });
    }

    return created;
  },
});

export const deleteEdgesForNode = mutation({
  args: {
    label: v.string(),
    nodeKey: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const batchLimit = args.limit ?? 50;

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", args.nodeKey),
        )
        .take(batchLimit),
      ctx.db
        .query("edges")
        .withIndex("by_label_to_from", (q) =>
          q.eq("label", normalized).eq("to", args.nodeKey),
        )
        .take(batchLimit),
    ]);

    const seen = new Set<string>();
    const toDelete = [];
    for (const edge of [...outgoing, ...incoming]) {
      const id = edge._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        toDelete.push(edge);
      }
    }

    const degreeDeltas = new Map<string, number>();
    for (const edge of toDelete) {
      await ctx.db.delete(edge._id);
      const eid = edgeId(normalized, edge.from, edge.to);
      await graphAggregate.deleteIfExists(ctx, { namespace: ["edges"], key: null, id: eid });
      await graphAggregate.deleteIfExists(ctx, { namespace: ["edges", normalized], key: null, id: eid });

      degreeDeltas.set(edge.from, (degreeDeltas.get(edge.from) ?? 0) + 1);
      if (edge.from !== edge.to) {
        degreeDeltas.set(edge.to, (degreeDeltas.get(edge.to) ?? 0) + 1);
      }
    }

    for (const [nodeKey, delta] of degreeDeltas) {
      const stats = await ctx.db
        .query("nodeStats")
        .withIndex("by_key", (q) => q.eq("key", nodeKey))
        .first();
      if (stats) {
        const oldDegree = stats.totalDegree;
        const newDegree = Math.max(0, oldDegree - delta);
        await ctx.db.patch(stats._id, { totalDegree: newDegree });
        await updateDegreeAggregate(ctx, { nodeKey, oldDegree, newDegree, edgeLabel: normalized });
      }
    }

    return { deleted: toDelete.length, hasMore: toDelete.length >= batchLimit };
  },
});
