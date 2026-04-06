import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { doc } from "convex-helpers/validators";
import { mutation, query } from "../_generated/server.js";
import { canonicalPair } from "../internal/canonical.js";
import { graphCounters, nodeTotalDegreeKey } from "../internal/counters.js";
import { normalizeLabel } from "../internal/normalize.js";
import schema from "../schema.js";

function counterKey(prefix: string, label?: string) {
  return label ? `${prefix}:${label}` : prefix;
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
      .query("graph_edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", from).eq("to", to),
      )
      .first();
    if (existing) return null;

    const labelRow = await ctx.db
      .query("graph_labels")
      .withIndex("by_type_value", (q) =>
        q.eq("type", "edge").eq("value", normalized),
      )
      .first();
    if (!labelRow) {
      await ctx.db.insert("graph_labels", {
        value: normalized,
        displayValue: args.label,
        type: "edge",
      });
    }

    await ctx.db.insert("graph_edges", {
      label: normalized,
      from,
      to,
      directed: isDirected,
      properties: args.properties,
    });

    await graphCounters.inc(ctx, counterKey("edges"));
    await graphCounters.inc(ctx, counterKey("edges", normalized));

    await graphCounters.inc(ctx, nodeTotalDegreeKey(from));
    if (from !== to) {
      await graphCounters.inc(ctx, nodeTotalDegreeKey(to));
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
      .query("graph_edges")
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
      .query("graph_edges")
      .withIndex("by_label_from_to", (q) =>
        q.eq("label", normalized).eq("from", from).eq("to", to),
      )
      .first();
    if (!edge) return null;
    await ctx.db.delete(edge._id);

    await graphCounters.dec(ctx, counterKey("edges"));
    await graphCounters.dec(ctx, counterKey("edges", normalized));

    await graphCounters.dec(ctx, nodeTotalDegreeKey(from));
    if (from !== to) {
      await graphCounters.dec(ctx, nodeTotalDegreeKey(to));
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
  returns: paginationResultValidator(doc(schema, "graph_edges")),
  handler: async (ctx, args) => {
    const normalized = normalizeLabel(args.label);
    const { from, to, node } = args;

    if (node != null) {
      const [outgoing, incoming] = await Promise.all([
        ctx.db
          .query("graph_edges")
          .withIndex("by_label_from_to", (q) =>
            q.eq("label", normalized).eq("from", node),
          )
          .collect(),
        ctx.db
          .query("graph_edges")
          .withIndex("by_label_to_from", (q) =>
            q.eq("label", normalized).eq("to", node),
          )
          .collect(),
      ]);
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
        .query("graph_edges")
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
        .query("graph_edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", from),
        )
        .paginate(args.paginationOpts);
    }
    if (to != null) {
      return await paginator(ctx.db, schema)
        .query("graph_edges")
        .withIndex("by_label_to_from", (q) =>
          q.eq("label", normalized).eq("to", to),
        )
        .paginate(args.paginationOpts);
    }
    return await paginator(ctx.db, schema)
      .query("graph_edges")
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
      .query("graph_labels")
      .withIndex("by_type_value", (q) =>
        q.eq("type", "edge").eq("value", normalized),
      )
      .first();
    if (!labelRow) {
      await ctx.db.insert("graph_labels", {
        value: normalized,
        displayValue: args.label,
        type: "edge",
      });
    }

    const degreeDeltas = new Map<string, number>();
    let created = 0;

    for (const e of args.edges) {
      const [from, to] = isDirected
        ? [e.from, e.to]
        : canonicalPair(e.from, e.to);

      const existing = await ctx.db
        .query("graph_edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", from).eq("to", to),
        )
        .first();
      if (existing) continue;

      await ctx.db.insert("graph_edges", {
        label: normalized,
        from,
        to,
        directed: isDirected,
        properties: e.properties,
      });

      degreeDeltas.set(from, (degreeDeltas.get(from) ?? 0) + 1);
      if (from !== to) {
        degreeDeltas.set(to, (degreeDeltas.get(to) ?? 0) + 1);
      }
      created++;
    }

    if (created > 0) {
      await graphCounters.add(ctx, counterKey("edges"), created);
      await graphCounters.add(ctx, counterKey("edges", normalized), created);
    }

    for (const [nodeKey, delta] of degreeDeltas) {
      await graphCounters.add(ctx, nodeTotalDegreeKey(nodeKey), delta);
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
        .query("graph_edges")
        .withIndex("by_label_from_to", (q) =>
          q.eq("label", normalized).eq("from", args.nodeKey),
        )
        .take(batchLimit),
      ctx.db
        .query("graph_edges")
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
      degreeDeltas.set(edge.from, (degreeDeltas.get(edge.from) ?? 0) + 1);
      if (edge.from !== edge.to) {
        degreeDeltas.set(edge.to, (degreeDeltas.get(edge.to) ?? 0) + 1);
      }
    }

    if (toDelete.length > 0) {
      await graphCounters.subtract(ctx, counterKey("edges"), toDelete.length);
      await graphCounters.subtract(
        ctx,
        counterKey("edges", normalized),
        toDelete.length,
      );
    }

    for (const [nodeKey, delta] of degreeDeltas) {
      await graphCounters.subtract(ctx, nodeTotalDegreeKey(nodeKey), delta);
    }

    return { deleted: toDelete.length, hasMore: toDelete.length >= batchLimit };
  },
});
