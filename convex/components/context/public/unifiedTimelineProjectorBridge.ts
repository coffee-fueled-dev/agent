import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { memoryEvents } from "../events";

/** Must match `PROJECTOR_ID` in app `unifiedTimeline`. */
const UNIFIED_PROJECTOR_ID = "unifiedThreadTimeline@v1";
const UNIFIED_STREAM_TYPE = "contextMemory" as const;

function assertUnifiedBridge(args: { projector: string; streamType: string }) {
  if (
    args.projector !== UNIFIED_PROJECTOR_ID ||
    args.streamType !== UNIFIED_STREAM_TYPE
  ) {
    throw new Error(
      "unifiedTimelineProjectorBridge: invalid projector or stream",
    );
  }
}

export const claimOrReadCheckpoint = mutation({
  args: {
    projector: v.string(),
    streamType: v.string(),
    leaseOwner: v.optional(v.string()),
    leaseDurationMs: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertUnifiedBridge(args);
    return memoryEvents.claimOrReadCheckpoint(ctx, {
      projector: args.projector,
      streamType: UNIFIED_STREAM_TYPE,
      leaseOwner: args.leaseOwner,
      leaseDurationMs: args.leaseDurationMs,
    });
  },
});

export const listUnprocessedEvents = query({
  args: {
    projector: v.string(),
    streamType: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertUnifiedBridge(args);
    return memoryEvents.listUnprocessed(ctx, {
      projector: args.projector,
      streamType: UNIFIED_STREAM_TYPE,
      limit: args.limit,
    });
  },
});

export const advanceCheckpoint = mutation({
  args: {
    projector: v.string(),
    streamType: v.string(),
    lastSequence: v.number(),
    leaseOwner: v.optional(v.string()),
    releaseClaim: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertUnifiedBridge(args);
    return memoryEvents.advanceCheckpoint(ctx, {
      projector: args.projector,
      streamType: UNIFIED_STREAM_TYPE,
      lastSequence: args.lastSequence,
      leaseOwner: args.leaseOwner,
      releaseClaim: args.releaseClaim,
    });
  },
});
