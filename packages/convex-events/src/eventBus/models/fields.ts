import { v } from "convex/values";

export const eventBusDimensionFields = {
  namespace: v.string(),
  kind: v.union(v.literal("eventType"), v.literal("streamType")),
  value: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
};

export const eventBusEntryFields = {
  sourceKey: v.string(),
  streamType: v.string(),
  namespace: v.string(),
  streamId: v.string(),
  eventId: v.string(),
  eventType: v.string(),
  eventTime: v.number(),
  payload: v.optional(v.any()),
  eventTypeId: v.id("eventBusDimensions"),
  streamTypeId: v.id("eventBusDimensions"),
};

export const eventBusEvictionBufferFields = {
  entryId: v.id("eventBusEntries"),
};

export const eventBusCountFields = {
  currentSize: v.number(),
};
