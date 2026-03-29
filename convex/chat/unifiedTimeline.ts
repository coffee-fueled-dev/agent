import type { PaginationOptions } from "convex/server";
import { z } from "zod/v4";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  type SessionQueryCtx,
  sessionPaginatedQuery,
  sessionQuery,
} from "../customFunctions";
import { expectedAccountNamespace } from "../models/auth/contextNamespace";

export const PROJECTOR_ID = "unifiedThreadTimeline@v1";
export const MAX_UNIFIED_TIMELINE_PER_PARTITION = 500;
/** Per list call; aligned with events component projector list cap. */
const PROJECTOR_BATCH_SIZE = 100;
/** Fairness cap across threadIdentity + contextMemory per cron tick. */
export const MAX_EVENTS_PROJECTED_PER_TICK = 200;

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

type ProjectorStreamSource = {
  list: (limit: number) => Promise<SourceEvent[]>;
  claim: () => Promise<unknown>;
};

function toSourceEvent(ev: {
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
}): SourceEvent {
  return {
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
}

/**
 * Round-robin merge of unprocessed projector batches. Yields after each indexed
 * read; the consumer must advance that stream's checkpoint after processing.
 * Not a reactive subscription — each step is a bounded runQuery.
 */
async function* mergeRoundRobinProjectorBatches(
  sources: ProjectorStreamSource[],
): AsyncGenerator<
  { streamIndex: number; batch: SourceEvent[] },
  void,
  undefined
> {
  await Promise.all(sources.map((s) => s.claim()));
  const exhausted = new Set<number>();
  const startOffset = Math.floor(Date.now() / 60_000) % sources.length;
  let round = startOffset;

  while (exhausted.size < sources.length) {
    let progressed = false;
    for (let i = 0; i < sources.length; i++) {
      const idx = (round + i) % sources.length;
      if (exhausted.has(idx)) continue;
      const raw = await sources[idx].list(PROJECTOR_BATCH_SIZE);
      if (raw.length === 0) {
        exhausted.add(idx);
        continue;
      }
      progressed = true;
      yield {
        streamIndex: idx,
        batch: raw.map(toSourceEvent),
      };
    }
    if (!progressed) break;
    round++;
  }
}

/**
 * Stable key for per-partition trim (`MAX_UNIFIED_TIMELINE_PER_PARTITION`) and
 * `listUnifiedTimeline({ threadId })` (thread-attributed context events use
 * `metadata.threadId` as the partition). The global `/events` stream uses
 * `sourceNamespace` on each row (`by_namespace_eventTime`), not this key.
 *
 * For `contextMemory` without a thread, `namespace::streamId` scopes the cap per
 * entry stream so one account does not share a single 500-row partition.
 */
function partitionKeyForEvent(ev: SourceEvent): string | null {
  if (ev.streamType === "threadIdentity") {
    return ev.streamId;
  }
  if (ev.streamType === "contextMemory") {
    const tid = ev.metadata?.threadId;
    if (typeof tid === "string" && tid.length > 0) {
      return tid;
    }
    return `${ev.namespace}::${ev.streamId}`;
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
    const streamSources: ProjectorStreamSource[] = [
      {
        claim: () =>
          ctx.runMutation(
            components.events.public.projectors.claimOrReadCheckpoint,
            {
              projector: PROJECTOR_ID,
              streamType: "threadIdentity",
            },
          ),
        list: (limit) =>
          ctx.runQuery(
            components.events.public.projectors.listUnprocessedEvents,
            {
              projector: PROJECTOR_ID,
              streamType: "threadIdentity",
              limit,
            },
          ),
      },
      {
        claim: () =>
          ctx.runMutation(
            components.context.public.unifiedTimelineProjectorBridge
              .claimOrReadCheckpoint,
            {
              projector: PROJECTOR_ID,
              streamType: "contextMemory",
            },
          ),
        list: (limit) =>
          ctx.runQuery(
            components.context.public.unifiedTimelineProjectorBridge
              .listUnprocessedEvents,
            {
              projector: PROJECTOR_ID,
              streamType: "contextMemory",
              limit,
            },
          ),
      },
    ];

    const advanceForStream = (streamIndex: number, lastSequence: number) => {
      if (streamIndex === 0) {
        return ctx.runMutation(
          components.events.public.projectors.advanceCheckpoint,
          {
            projector: PROJECTOR_ID,
            streamType: "threadIdentity",
            lastSequence,
          },
        );
      }
      return ctx.runMutation(
        components.context.public.unifiedTimelineProjectorBridge
          .advanceCheckpoint,
        {
          projector: PROJECTOR_ID,
          streamType: "contextMemory",
          lastSequence,
        },
      );
    };

    let totalEvents = 0;
    for await (const { streamIndex, batch } of mergeRoundRobinProjectorBatches(
      streamSources,
    )) {
      let maxSeq = 0;
      for (const src of batch) {
        maxSeq = Math.max(maxSeq, src.globalSequence);
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

      await advanceForStream(streamIndex, maxSeq);
      totalEvents += batch.length;
      if (totalEvents >= MAX_EVENTS_PROJECTED_PER_TICK) break;
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
