import { v } from "convex/values";
import { mutation } from "../_generated/server.js";
import {
  actorValidator,
  eventEntryValidator,
  metadataValidator,
  normalizeStreamNamespace,
  sessionValidator,
} from "../internal/shared.js";
import {
  loadEvent,
  loadStream,
  readLatestGlobalSequence,
} from "../internal/store.js";

export const appendToStream = mutation({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    namespace: v.optional(v.string()),
    eventId: v.string(),
    eventType: v.string(),
    payload: v.optional(v.any()),
    expectedVersion: v.optional(v.number()),
    metadata: metadataValidator,
    causationId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    actor: actorValidator,
    session: sessionValidator,
    eventTime: v.optional(v.number()),
  },
  returns: eventEntryValidator,
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);

    const existing = await loadEvent(ctx, { ...args, namespace });
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const stream = await loadStream(ctx, { ...args, namespace });
    const currentVersion = stream?.version ?? 0;

    if (
      args.expectedVersion != null &&
      args.expectedVersion !== currentVersion
    ) {
      throw new Error(
        `Expected stream version ${args.expectedVersion}, got ${currentVersion}`,
      );
    }

    const globalSequence = (await readLatestGlobalSequence(ctx)) + 1;
    const streamVersion = currentVersion + 1;

    const entry = {
      globalSequence,
      streamType: args.streamType,
      namespace,
      streamId: args.streamId,
      streamVersion,
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload,
      metadata: args.metadata,
      causationId: args.causationId,
      correlationId: args.correlationId,
      actor: args.actor,
      session: args.session,
      eventTime: args.eventTime ?? now,
    };

    const insertedId = await ctx.db.insert("event_entries", entry);

    if (stream) {
      await ctx.db.patch(stream._id, {
        version: streamVersion,
        lastEventSequence: globalSequence,
        updatedTime: now,
      });
    } else {
      await ctx.db.insert("event_streams", {
        streamType: args.streamType,
        namespace,
        streamId: args.streamId,
        version: streamVersion,
        lastEventSequence: globalSequence,
        createdTime: now,
        updatedTime: now,
      });
    }

    const inserted = await ctx.db.get(insertedId);
    if (!inserted) throw new Error("Failed to load event after insert");
    return inserted;
  },
});
