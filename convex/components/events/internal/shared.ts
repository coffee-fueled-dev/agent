import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import schema from "../schema";

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

export const sessionValidator = v.optional(v.string());

export const streamStateValidator = doc(schema, "event_streams");

export const eventEntryValidator = doc(schema, "event_entries");

export const checkpointValidator = doc(schema, "event_projector_checkpoints");
