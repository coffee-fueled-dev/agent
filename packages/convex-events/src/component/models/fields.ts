import { v } from "convex/values";

export const metadataValidator = v.optional(
  v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
);

export const eventStreamFields = {
  streamType: v.string(),
  namespace: v.string(),
  streamId: v.string(),
  version: v.number(),
  lastEventSequence: v.union(v.number(), v.null()),
  createdTime: v.number(),
  updatedTime: v.number(),
};

export const eventEntryFields = {
  globalSequence: v.number(),
  streamType: v.string(),
  namespace: v.string(),
  streamId: v.string(),
  streamVersion: v.number(),
  eventId: v.string(),
  eventType: v.string(),
  payload: v.optional(v.any()),
  metadata: metadataValidator,
  causationId: v.optional(v.string()),
  correlationId: v.optional(v.string()),
  session: v.optional(v.string()),
  eventTime: v.number(),
  eventTypeId: v.id("dimensions"),
  streamTypeId: v.id("dimensions"),
};

export const eventStreamMetricFields = {
  name: v.string(),
  groupKey: v.string(),
  count: v.number(),
  lastEventTime: v.number(),
};

export const eventProjectorCheckpointFields = {
  projector: v.string(),
  streamType: v.string(),
  lastSequence: v.number(),
  updatedTime: v.number(),
  leaseOwner: v.optional(v.string()),
  leaseExpiresAt: v.optional(v.number()),
};
