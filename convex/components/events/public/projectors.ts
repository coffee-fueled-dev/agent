import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { checkpointValidator, eventEntryValidator } from "../internal/shared";
import { hasActiveLease, loadCheckpoint } from "../internal/store";

export const claimOrReadCheckpoint = mutation({
  args: {
    projector: v.string(),
    streamType: v.string(),
    leaseOwner: v.optional(v.string()),
    leaseDurationMs: v.optional(v.number()),
  },
  returns: v.object({
    checkpoint: checkpointValidator,
    claimed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const checkpoint = await loadCheckpoint(ctx, args);

    const nextLeaseOwner = args.leaseOwner;
    const nextLeaseExpiresAt =
      nextLeaseOwner != null
        ? now + Math.max(0, args.leaseDurationMs ?? 0)
        : undefined;

    if (!checkpoint) {
      const next = {
        projector: args.projector,
        streamType: args.streamType,
        lastSequence: 0,
        updatedTime: now,
        leaseOwner: nextLeaseOwner,
        leaseExpiresAt: nextLeaseExpiresAt,
      };
      const id = await ctx.db.insert("event_projector_checkpoints", next);
      const inserted = await ctx.db.get(id);
      if (!inserted) throw new Error("Failed to load checkpoint after insert");
      return { checkpoint: inserted, claimed: nextLeaseOwner != null };
    }

    if (
      nextLeaseOwner != null &&
      hasActiveLease(checkpoint, now) &&
      checkpoint.leaseOwner !== nextLeaseOwner
    ) {
      return { checkpoint, claimed: false };
    }

    const next = {
      projector: checkpoint.projector,
      streamType: checkpoint.streamType,
      lastSequence: checkpoint.lastSequence,
      updatedTime: now,
      leaseOwner: nextLeaseOwner ?? checkpoint.leaseOwner,
      leaseExpiresAt: nextLeaseOwner
        ? nextLeaseExpiresAt
        : checkpoint.leaseExpiresAt,
    };

    await ctx.db.patch(checkpoint._id, next);
    const updated = await ctx.db.get(checkpoint._id);
    if (!updated) throw new Error("Failed to load checkpoint after patch");
    return { checkpoint: updated, claimed: nextLeaseOwner != null };
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
  returns: checkpointValidator,
  handler: async (ctx, args) => {
    const checkpoint = await loadCheckpoint(ctx, args);
    if (!checkpoint) {
      throw new Error(
        `Projector checkpoint "${args.projector}" for "${args.streamType}" does not exist`,
      );
    }

    if (
      args.leaseOwner != null &&
      checkpoint.leaseOwner != null &&
      checkpoint.leaseOwner !== args.leaseOwner
    ) {
      throw new Error("Projector lease is held by another owner");
    }

    const next = {
      projector: checkpoint.projector,
      streamType: checkpoint.streamType,
      lastSequence: Math.max(checkpoint.lastSequence, args.lastSequence),
      updatedTime: Date.now(),
      leaseOwner: args.releaseClaim ? undefined : checkpoint.leaseOwner,
      leaseExpiresAt: args.releaseClaim ? undefined : checkpoint.leaseExpiresAt,
    };

    await ctx.db.patch(checkpoint._id, next);
    const updated = await ctx.db.get(checkpoint._id);
    if (!updated) throw new Error("Failed to load checkpoint after patch");
    return updated;
  },
});

export const readCheckpoint = query({
  args: {
    projector: v.string(),
    streamType: v.string(),
  },
  returns: v.union(checkpointValidator, v.null()),
  handler: async (ctx, args) => {
    return await loadCheckpoint(ctx, args);
  },
});

export const listUnprocessedEvents = query({
  args: {
    projector: v.string(),
    streamType: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(eventEntryValidator),
  handler: async (ctx, args) => {
    const checkpoint = await loadCheckpoint(ctx, args);
    const lastSequence = checkpoint?.lastSequence ?? 0;
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));

    return await ctx.db
      .query("event_entries")
      .withIndex("by_type_sequence", (q) =>
        q.eq("streamType", args.streamType).gt("globalSequence", lastSequence),
      )
      .take(limit);
  },
});
