import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { memoryEvents } from "./components/context/events";
import { createEventBus, EventBusListener } from "./components/events/eventBus";
import { events } from "./events";

export const bus = createEventBus({
  eviction: { type: "fifo", options: { size: 1000 } },
});

export const busListener: EventBusListener = new EventBusListener({
  sources: [
    { client: memoryEvents, key: "contextMemory" },
    { client: events, key: "appEvents" },
  ],
  writer: internal.eventBus.writeBusEntry,
  eviction: bus.evictionConfig,
});

async function getOrCreateCount(ctx: MutationCtx) {
  const row = await ctx.db.query("eventBusCount").first();
  if (row) return row;
  const id = await ctx.db.insert("eventBusCount", { currentSize: 0 });
  const count = await ctx.db.get(id);
  if (!count) throw new Error("Failed to create event bus count");
  return count;
}

export const writeBusEntry = internalMutation({
  args: bus.entryValidator.fields,
  handler: async (ctx, args): Promise<void> => {
    const counter = await getOrCreateCount(ctx);

    const staged = await ctx.db.query("eventBusEvictionBuffer").collect();
    for (const buf of staged) {
      const entry = await ctx.db.get(buf.entryId);
      if (entry) {
        await ctx.db.delete(entry._id);
        counter.currentSize--;
      }
      await ctx.db.delete(buf._id);
    }

    const existing = await ctx.db
      .query("eventBusEntries")
      .withIndex("by_source_event", (q) =>
        q.eq("sourceKey", args.sourceKey).eq("eventId", args.eventId),
      )
      .first();
    if (existing) {
      if (staged.length > 0) {
        await ctx.db.patch(counter._id, { currentSize: counter.currentSize });
      }
      return;
    }

    await ctx.db.insert("eventBusEntries", args);
    counter.currentSize++;

    if (counter.currentSize >= bus.evictionConfig.options.size) {
      const oldest = await ctx.db
        .query("eventBusEntries")
        .withIndex("by_time")
        .order("asc")
        .first();
      if (oldest) {
        await ctx.db.insert("eventBusEvictionBuffer", {
          entryId: oldest._id,
        });
      }
    }

    await ctx.db.patch(counter._id, { currentSize: counter.currentSize });
  },
});
