import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const insertRecord = internalMutation({
  args: {
    namespace: v.string(),
    memoryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("memoryRecords", args);
  },
});

export const patchRecord = internalMutation({
  args: {
    memoryId: v.string(),
    key: v.optional(v.string()),
    title: v.optional(v.string()),
    textPreview: v.string(),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (!row) return;
    const patch: Record<string, unknown> = {
      textPreview: args.textPreview,
      updatedAt: args.updatedAt,
    };
    if (args.title !== undefined) patch.title = args.title;
    if (args.key !== undefined) patch.key = args.key;
    await ctx.db.patch(row._id, patch);
  },
});

export const deleteRecord = internalMutation({
  args: { namespace: v.string(), memoryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (!row || row.namespace !== args.namespace) return;
    await ctx.db.delete(row._id);
  },
});

export const getBatchByMemoryIds = internalQuery({
  args: { namespace: v.string(), memoryIds: v.array(v.string()) },
  returns: v.array(
    v.union(
      v.null(),
      v.object({
        memoryId: v.string(),
        key: v.string(),
        title: v.optional(v.string()),
        textPreview: v.string(),
      }),
    ),
  ),
  handler: async (ctx, args) => {
    const out: Array<{
      memoryId: string;
      key: string;
      title?: string;
      textPreview: string;
    } | null> = [];
    for (const memoryId of args.memoryIds) {
      const row = await ctx.db
        .query("memoryRecords")
        .withIndex("by_memoryId", (q) => q.eq("memoryId", memoryId))
        .first();
      if (!row || row.namespace !== args.namespace) {
        out.push(null);
        continue;
      }
      out.push({
        memoryId: row.memoryId,
        key: row.key,
        title: row.title,
        textPreview: row.textPreview,
      });
    }
    return out;
  },
});

export const getByMemoryId = internalQuery({
  args: { memoryId: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memoryRecords")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
  },
});

export const getByNamespaceKey = internalQuery({
  args: { namespace: v.string(), key: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memoryRecords")
      .withIndex("by_namespace_and_key", (q) =>
        q.eq("namespace", args.namespace).eq("key", args.key),
      )
      .first();
  },
});

export const getSourceMapping = internalQuery({
  args: { namespace: v.string(), sourceRef: v.string() },
  returns: v.union(v.null(), v.object({ memoryId: v.string() })),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memorySourceMap")
      .withIndex("by_namespace_and_sourceRef", (q) =>
        q.eq("namespace", args.namespace).eq("sourceRef", args.sourceRef),
      )
      .first();
    if (!row) return null;
    return { memoryId: row.memoryId };
  },
});

export const upsertSourceMap = internalMutation({
  args: {
    namespace: v.string(),
    sourceRef: v.string(),
    memoryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memorySourceMap")
      .withIndex("by_namespace_and_sourceRef", (q) =>
        q.eq("namespace", args.namespace).eq("sourceRef", args.sourceRef),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { memoryId: args.memoryId });
    } else {
      await ctx.db.insert("memorySourceMap", {
        namespace: args.namespace,
        sourceRef: args.sourceRef,
        memoryId: args.memoryId,
      });
    }
  },
});

export const deleteSourceMapsForMemory = internalMutation({
  args: { namespace: v.string(), memoryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("memorySourceMap")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .take(500);
    for (const r of rows) {
      if (r.namespace === args.namespace) await ctx.db.delete(r._id);
    }
  },
});
