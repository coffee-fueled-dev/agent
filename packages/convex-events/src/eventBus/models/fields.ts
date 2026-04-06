import { v } from "convex/values";

export const eventBusEntryFields = {
  sourceKey: v.string(),
  streamType: v.string(),
  namespace: v.string(),
  streamId: v.string(),
  eventId: v.string(),
  eventType: v.string(),
  eventTime: v.number(),
  /** FIFO scope: `${ruleIndex}` + NUL + `buildGroupKey(...)` — see `fifoBucketKeyForRule`. */
  fifoBucketKey: v.string(),
  payload: v.optional(v.any()),
  eventTypeId: v.id("dimensions"),
  streamTypeId: v.id("dimensions"),
};

export const eventBusEvictionBufferFields = {
  entryId: v.id("eventBusEntries"),
};

export const eventBusCountFields = {
  bucketKey: v.string(),
  currentSize: v.number(),
};
