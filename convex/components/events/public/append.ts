import { v } from "convex/values";
import { eventsConfig } from "../../../events.config";
import { mutation } from "../_generated/server";
import {
  actorValidator,
  eventEntryValidator,
  metadataValidator,
} from "../internal/shared";
import {
  loadEvent,
  loadStream,
  readLatestGlobalSequence,
} from "../internal/store";

function assertRegisteredStream(streamType: string, eventType: string) {
  const streams = eventsConfig.streams as readonly {
    streamType: string;
    eventTypes: readonly string[];
  }[];

  if (streams.length === 0) {
    return;
  }

  const stream = streams.find(
    (candidate) => candidate.streamType === streamType,
  );

  if (!stream) {
    throw new Error(
      `Unknown event streamType "${streamType}". Register it in convex/events.config.ts.`,
    );
  }

  if (
    stream.eventTypes.length > 0 &&
    !(stream.eventTypes as readonly string[]).includes(eventType)
  ) {
    throw new Error(
      `Unknown eventType "${eventType}" for streamType "${streamType}". Register it in convex/events.config.ts.`,
    );
  }
}

export const appendToStream = mutation({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    payload: v.optional(v.any()),
    expectedVersion: v.optional(v.number()),
    metadata: metadataValidator,
    causationId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    actor: actorValidator,
    eventTime: v.optional(v.number()),
  },
  returns: eventEntryValidator,
  handler: async (ctx, args) => {
    assertRegisteredStream(args.streamType, args.eventType);

    const existing = await loadEvent(ctx, args);
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const stream = await loadStream(ctx, args);
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
      streamId: args.streamId,
      streamVersion,
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload,
      metadata: args.metadata,
      causationId: args.causationId,
      correlationId: args.correlationId,
      actor: args.actor,
      eventTime: args.eventTime ?? now,
    };

    await ctx.db.insert("event_entries", entry);

    if (stream) {
      await ctx.db.patch(stream._id, {
        version: streamVersion,
        lastEventSequence: globalSequence,
        updatedTime: now,
      });
    } else {
      await ctx.db.insert("event_streams", {
        streamType: args.streamType,
        streamId: args.streamId,
        version: streamVersion,
        lastEventSequence: globalSequence,
        createdTime: now,
        updatedTime: now,
      });
    }

    return entry;
  },
});
