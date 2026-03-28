import type { PaginationOptions } from "convex/server";
import { z } from "zod/v4";
import type { Id } from "../_generated/dataModel";
import { components } from "../_generated/api";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  type SessionQueryCtx,
  sessionPaginatedQuery,
  sessionQuery,
} from "../customFunctions";
import { expectedAccountNamespace } from "../models/auth/contextNamespace";

export const PROJECTOR_ID = "unifiedThreadTimeline@v1";
const STREAM_TYPES = ["threadIdentity", "contextMemory"] as const;
export const MAX_UNIFIED_TIMELINE_PER_PARTITION = 500;

type SourceEvent = {
  globalSequence: number;
  streamType: string;
  namespace: string;
  streamId: string;
  eventId: string;
  eventType: string;
  eventTime: number;
  correlationId?: string;
  causationId?: string;
  actor?: { byType: string; byId: string };
  session?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

function partitionKeyForEvent(ev: SourceEvent): string | null {
  if (ev.streamType === "threadIdentity") {
    return ev.streamId;
  }
  if (ev.streamType === "contextMemory") {
    const tid = ev.metadata?.threadId;
    return typeof tid === "string" && tid.length > 0 ? tid : null;
  }
  return null;
}

async function trimPartition(ctx: MutationCtx, partitionKey: string) {
  const rows = await ctx.db
    .query("unifiedTimeline")
    .withIndex("by_partition_sequence", (q) =>
      q.eq("partitionKey", partitionKey),
    )
    .order("asc")
    .collect();
  if (rows.length <= MAX_UNIFIED_TIMELINE_PER_PARTITION) return;
  const overflow = rows.length - MAX_UNIFIED_TIMELINE_PER_PARTITION;
  for (let i = 0; i < overflow; i++) {
    const row = rows[i];
    if (row) await ctx.db.delete(row._id);
  }
}

export const runProjectorTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const streamType of STREAM_TYPES) {
      // Ensure a checkpoint row exists; listUnprocessedEvents tolerates missing
      // checkpoints (treats as 0) but advanceCheckpoint requires the row.
      await ctx.runMutation(
        components.events.public.projectors.claimOrReadCheckpoint,
        {
          projector: PROJECTOR_ID,
          streamType,
        },
      );

      const batch = await ctx.runQuery(
        components.events.public.projectors.listUnprocessedEvents,
        {
          projector: PROJECTOR_ID,
          streamType,
          limit: 100,
        },
      );
      if (batch.length === 0) continue;

      let maxSeq = 0;
      for (const ev of batch) {
        maxSeq = Math.max(maxSeq, ev.globalSequence);
        const src: SourceEvent = {
          globalSequence: ev.globalSequence,
          streamType: ev.streamType,
          namespace: ev.namespace,
          streamId: ev.streamId,
          eventId: ev.eventId,
          eventType: ev.eventType,
          eventTime: ev.eventTime,
          correlationId: ev.correlationId,
          causationId: ev.causationId,
          actor: ev.actor ?? undefined,
          session: ev.session ?? undefined,
          metadata: ev.metadata,
        };
        const pk = partitionKeyForEvent(src);
        if (!pk) continue;

        const existing = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_source_event", (q) =>
            q
              .eq("sourceStreamType", src.streamType)
              .eq("sourceNamespace", src.namespace)
              .eq("sourceStreamId", src.streamId)
              .eq("sourceEventId", src.eventId),
          )
          .first();
        if (existing) continue;

        await ctx.db.insert("unifiedTimeline", {
          partitionKey: pk,
          sourceGlobalSequence: src.globalSequence,
          sourceStreamType: src.streamType,
          sourceNamespace: src.namespace,
          sourceStreamId: src.streamId,
          sourceEventId: src.eventId,
          eventType: src.eventType,
          eventTime: src.eventTime,
          correlationId: src.correlationId,
          causationId: src.causationId,
          actor: src.actor,
          session: src.session,
          metadata: src.metadata,
        });
        await trimPartition(ctx, pk);
      }

      await ctx.runMutation(
        components.events.public.projectors.advanceCheckpoint,
        {
          projector: PROJECTOR_ID,
          streamType,
          lastSequence: maxSeq,
        },
      );
    }
    return null;
  },
});

export const listUnifiedTimeline = sessionPaginatedQuery({
  args: { threadId: z.string() },
  handler: async (
    ctx: SessionQueryCtx,
    args: { threadId: string; paginationOpts: PaginationOptions },
  ) => {
    if (!ctx.account) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread?.userId || String(thread.userId) !== String(ctx.account._id)) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("unifiedTimeline")
      .withIndex("by_partition_sequence", (q) =>
        q.eq("partitionKey", args.threadId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listUnifiedTimelineByNamespace = sessionPaginatedQuery({
  args: {},
  handler: async (
    ctx: SessionQueryCtx,
    args: { paginationOpts: PaginationOptions },
  ) => {
    if (!ctx.account) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const namespace = expectedAccountNamespace(ctx.account._id);
    return await ctx.db
      .query("unifiedTimeline")
      .withIndex("by_namespace_eventTime", (q) =>
        q.eq("sourceNamespace", namespace),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getUnifiedTimelineEvent = sessionQuery({
  args: { id: z.string() },
  handler: async (ctx: SessionQueryCtx, args: { id: string }) => {
    if (!ctx.account) return null;
    const expected = expectedAccountNamespace(ctx.account._id);
    const doc = await ctx.db.get(args.id as Id<"unifiedTimeline">);
    if (!doc || doc.sourceNamespace !== expected) return null;
    return doc;
  },
});
