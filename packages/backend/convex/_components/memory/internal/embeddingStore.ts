import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const upsert = internalMutation({
  args: {
    memoryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memoryEmbeddings")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { embedding: args.embedding });
    } else {
      await ctx.db.insert("memoryEmbeddings", args);
    }
  },
});

export const remove = internalMutation({
  args: { memoryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memoryEmbeddings")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const get = internalQuery({
  args: { memoryId: v.string() },
  returns: v.union(v.null(), v.array(v.number())),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("memoryEmbeddings")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();
    return row?.embedding ?? null;
  },
});

export const listByNamespace = internalQuery({
  args: { namespace: v.string(), limit: v.number() },
  returns: v.array(
    v.object({ memoryId: v.string(), embedding: v.array(v.number()) }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("memoryEmbeddings")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .take(args.limit);
    return rows.map((r) => ({ memoryId: r.memoryId, embedding: r.embedding }));
  },
});
