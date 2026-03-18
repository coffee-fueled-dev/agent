import { v } from "convex/values";

export const streamRefFields = {
  streamType: v.string(),
  streamId: v.string(),
} as const;

export const eventRefFields = {
  ...streamRefFields,
  eventId: v.string(),
} as const;

export const metadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export const metadataValidator = v.optional(
  v.record(v.string(), metadataValueValidator),
);

export const actorValidator = v.optional(
  v.object({
    byType: v.string(),
    byId: v.string(),
  }),
);

export const streamStateValidator = v.object({
  streamType: v.string(),
  streamId: v.string(),
  version: v.number(),
  lastEventSequence: v.union(v.number(), v.null()),
  createdTime: v.number(),
  updatedTime: v.number(),
});

export const eventEntryValidator = v.object({
  globalSequence: v.number(),
  streamType: v.string(),
  streamId: v.string(),
  streamVersion: v.number(),
  eventId: v.string(),
  eventType: v.string(),
  payload: v.optional(v.any()),
  metadata: metadataValidator,
  causationId: v.optional(v.string()),
  correlationId: v.optional(v.string()),
  actor: actorValidator,
  eventTime: v.number(),
});

export const checkpointValidator = v.object({
  projector: v.string(),
  streamType: v.string(),
  lastSequence: v.number(),
  updatedTime: v.number(),
  leaseOwner: v.optional(v.string()),
  leaseExpiresAt: v.optional(v.number()),
});
