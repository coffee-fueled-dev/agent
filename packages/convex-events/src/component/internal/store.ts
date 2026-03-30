import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { normalizeStreamNamespace } from "./shared.js";

type EventsCtx = MutationCtx | QueryCtx;

export async function loadStream(
  ctx: EventsCtx,
  args: {
    streamType: string;
    namespace?: string;
    streamId: string;
  },
) {
  const namespace = normalizeStreamNamespace(args.namespace);
  return await ctx.db
    .query("event_streams")
    .withIndex("by_stream", (q) =>
      q
        .eq("streamType", args.streamType)
        .eq("namespace", namespace)
        .eq("streamId", args.streamId),
    )
    .first();
}

export async function loadEvent(
  ctx: EventsCtx,
  args: {
    streamType: string;
    namespace?: string;
    streamId: string;
    eventId: string;
  },
) {
  const namespace = normalizeStreamNamespace(args.namespace);
  return await ctx.db
    .query("event_entries")
    .withIndex("by_stream_event", (q) =>
      q
        .eq("streamType", args.streamType)
        .eq("namespace", namespace)
        .eq("streamId", args.streamId)
        .eq("eventId", args.eventId),
    )
    .first();
}

export async function loadCheckpoint(
  ctx: EventsCtx,
  args: {
    projector: string;
    streamType: string;
  },
) {
  return await ctx.db
    .query("event_projector_checkpoints")
    .withIndex("by_projector_stream", (q) =>
      q.eq("projector", args.projector).eq("streamType", args.streamType),
    )
    .first();
}

export async function readLatestGlobalSequence(ctx: MutationCtx) {
  const latest = await ctx.db
    .query("event_entries")
    .withIndex("by_global_sequence")
    .order("desc")
    .first();
  return latest?.globalSequence ?? 0;
}

export function hasActiveLease(
  checkpoint: Doc<"event_projector_checkpoints"> | null | undefined,
  now: number,
) {
  return (
    checkpoint?.leaseOwner != null &&
    checkpoint.leaseExpiresAt != null &&
    checkpoint.leaseExpiresAt > now
  );
}
