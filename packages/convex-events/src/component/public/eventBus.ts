import { v } from "convex/values";
import { type MutationCtx, mutation } from "../_generated/server.js";

async function getOrCreateCount(ctx: MutationCtx) {
  const row = await ctx.db.query("event_bus_count").first();
  if (row) return row;
  const id = await ctx.db.insert("event_bus_count", { currentSize: 0 });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create event bus count");
  return created;
}

export const writeBusEntry = mutation({
  args: {
    sourceKey: v.string(),
    streamType: v.string(),
    namespace: v.string(),
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    eventTime: v.number(),
    payload: v.optional(v.any()),
    maxSize: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const counter = await getOrCreateCount(ctx);

    const staged = await ctx.db.query("event_bus_eviction_buffer").collect();
    for (const buf of staged) {
      const entry = await ctx.db.get(buf.entryId);
      if (entry) {
        await ctx.db.delete(entry._id);
        counter.currentSize--;
      }
      await ctx.db.delete(buf._id);
    }

    const existing = await ctx.db
      .query("event_bus_entries")
      .withIndex("by_source_event", (q) =>
        q.eq("sourceKey", args.sourceKey).eq("eventId", args.eventId),
      )
      .first();
    if (existing) {
      if (staged.length > 0) {
        await ctx.db.patch(counter._id, { currentSize: counter.currentSize });
      }
      return null;
    }

    const { maxSize, ...entryFields } = args;
    await ctx.db.insert("event_bus_entries", entryFields);
    counter.currentSize++;

    if (counter.currentSize >= maxSize) {
      const oldest = await ctx.db
        .query("event_bus_entries")
        .withIndex("by_time")
        .order("asc")
        .first();
      if (oldest) {
        await ctx.db.insert("event_bus_eviction_buffer", {
          entryId: oldest._id,
        });
      }
    }

    await ctx.db.patch(counter._id, { currentSize: counter.currentSize });
    return null;
  },
});
