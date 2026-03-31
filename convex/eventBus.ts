import { createEventBus } from "@very-coffee/convex-events/eventBus";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { context } from "./context";
import { events } from "./events";

export const { listener: busListener, tables: busTables } = createEventBus({
  eviction: { type: "fifo", options: { size: 1000 } },
  sources: [
    { client: events, key: "app" },
    { client: context.events, key: "context" },
  ],
});

export const bus = { tables: busTables };

export const listEventBusEntries = query({
  args: {
    namespace: v.optional(v.string()),
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
    eventTimeMin: v.optional(v.number()),
    eventTimeMax: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await busListener.listEntries(ctx, args);
  },
});

export const listEventBusDimensions = query({
  args: {
    namespace: v.optional(v.string()),
    kind: v.union(v.literal("eventType"), v.literal("streamType")),
  },
  handler: async (ctx, args) => {
    return await busListener.listDimensions(ctx, args);
  },
});
