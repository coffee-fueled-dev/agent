import type { PaginationOptions, PaginationResult } from "convex/server";
import { z } from "zod/v4";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { createContextClient } from "../context/contextClient";
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
      const source = sources[idx];
      if (!source) continue;
      const raw = await source.list(PROJECTOR_BATCH_SIZE);
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
 * `listUnifiedTimelineEvents({ threadId })` (thread-attributed context events use
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
    const raw = ev.metadata?.threadId;
    if (raw != null) {
      const tid = String(raw).trim();
      if (tid.length > 0) {
        return tid;
      }
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

export type DimensionKind = "eventType" | "sourceStreamType";

async function getOrCreateDimension(
  ctx: MutationCtx,
  args: { namespace: string; kind: DimensionKind; value: string },
): Promise<Id<"unifiedTimelineDimensions">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("unifiedTimelineDimensions")
    .withIndex("by_namespace_kind_value", (q) =>
      q
        .eq("namespace", args.namespace)
        .eq("kind", args.kind)
        .eq("value", args.value),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { lastSeenAt: now });
    return existing._id;
  }
  return await ctx.db.insert("unifiedTimelineDimensions", {
    namespace: args.namespace,
    kind: args.kind,
    value: args.value,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

/** Public row shape: fact + labels from dimension rows (for UI without extra round trips). */
export type UnifiedTimelineRowView = Doc<"unifiedTimeline"> & {
  eventTypeLabel: string;
  sourceStreamTypeLabel: string;
};

async function hydrateUnifiedTimelineRows(
  ctx: QueryCtx,
  rows: Doc<"unifiedTimeline">[],
): Promise<UnifiedTimelineRowView[]> {
  const idSet = new Set<Id<"unifiedTimelineDimensions">>();
  for (const r of rows) {
    idSet.add(r.eventTypeId);
    idSet.add(r.sourceStreamTypeId);
  }
  const dims = await Promise.all([...idSet].map((id) => ctx.db.get(id)));
  const byId = new Map(
    dims
      .filter((d): d is NonNullable<typeof d> => d != null)
      .map((d) => [d._id, d] as const),
  );
  return rows.map((r) => ({
    ...r,
    eventTypeLabel: byId.get(r.eventTypeId)?.value ?? "?",
    sourceStreamTypeLabel: byId.get(r.sourceStreamTypeId)?.value ?? "?",
  }));
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

        const eventTypeId = await getOrCreateDimension(ctx, {
          namespace: src.namespace,
          kind: "eventType",
          value: src.eventType,
        });
        const sourceStreamTypeId = await getOrCreateDimension(ctx, {
          namespace: src.namespace,
          kind: "sourceStreamType",
          value: src.streamType,
        });

        const existing = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_source_event", (q) =>
            q
              .eq("sourceStreamTypeId", sourceStreamTypeId)
              .eq("sourceNamespace", src.namespace)
              .eq("sourceStreamId", src.streamId)
              .eq("sourceEventId", src.eventId),
          )
          .first();
        if (existing) continue;

        await ctx.db.insert("unifiedTimeline", {
          partitionKey: pk,
          sourceGlobalSequence: src.globalSequence,
          sourceStreamTypeId,
          sourceNamespace: src.namespace,
          sourceStreamId: src.streamId,
          sourceEventId: src.eventId,
          eventTypeId,
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

const unifiedTimelineListArgs = z
  .object({
    /** Thread scope: partition key = thread id (tool + thread-attributed context rows). */
    threadId: z.string().optional(),
    /** Entry scope: `unifiedTimeline.sourceStreamId` (e.g. context entry id). Mutually exclusive with `threadId`. */
    sourceStreamId: z.string().optional(),
    eventTypeId: z.string().optional(),
    sourceStreamTypeId: z.string().optional(),
    eventTimeMin: z.number().optional(),
    eventTimeMax: z.number().optional(),
  })
  .refine((a) => !(a.threadId?.trim() && a.sourceStreamId?.trim()), {
    message: "threadId and sourceStreamId are mutually exclusive",
  });

function parseDimensionId(
  raw: string | undefined,
): Id<"unifiedTimelineDimensions"> | undefined {
  const t = raw?.trim();
  return t ? (t as Id<"unifiedTimelineDimensions">) : undefined;
}

/**
 * Single paginated read model for all event UIs: thread (chat), account namespace
 * (`/events`), or one context entry stream (`sourceStreamId` = entry id).
 */
export const listUnifiedTimelineEvents = sessionPaginatedQuery({
  args: unifiedTimelineListArgs,
  handler: async (
    ctx: SessionQueryCtx,
    args: {
      paginationOpts: PaginationOptions;
    } & z.infer<typeof unifiedTimelineListArgs>,
  ) => {
    const empty = {
      page: [] as Doc<"unifiedTimeline">[],
      isDone: true,
      continueCursor: "",
    };

    if (!ctx.account) {
      return { ...empty, page: await hydrateUnifiedTimelineRows(ctx, []) };
    }

    const threadId = args.threadId?.trim();
    const entryStreamId = args.sourceStreamId?.trim();
    const eventTypeId = parseDimensionId(args.eventTypeId);
    const sourceStreamTypeId = parseDimensionId(args.sourceStreamTypeId);
    const minT = args.eventTimeMin;
    const maxT = args.eventTimeMax;

    if (threadId) {
      const thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId,
      });
      if (!thread) {
        return { ...empty, page: await hydrateUnifiedTimelineRows(ctx, []) };
      }
      if (
        thread.userId != null &&
        String(thread.userId) !== String(ctx.account._id)
      ) {
        return { ...empty, page: await hydrateUnifiedTimelineRows(ctx, []) };
      }

      const page = await ctx.db
        .query("unifiedTimeline")
        .withIndex("by_partition_sequence", (q) =>
          q.eq("partitionKey", threadId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: await hydrateUnifiedTimelineRows(ctx, page.page),
      };
    }

    const namespace = expectedAccountNamespace(ctx.account._id);

    if (entryStreamId) {
      const entry = await createContextClient().getContextDetail(ctx, {
        namespace,
        entryId: entryStreamId,
      });
      if (!entry) {
        return { ...empty, page: await hydrateUnifiedTimelineRows(ctx, []) };
      }

      /** Projected rows use canonical `entryId` as `sourceStreamId`, not legacy URL ids. */
      const canonicalEntryId = entry.entryId;

      let page: PaginationResult<Doc<"unifiedTimeline">>;

      if (eventTypeId && sourceStreamTypeId) {
        page = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_namespace_sourceStream_time", (q) => {
            const prefix = q
              .eq("sourceNamespace", namespace)
              .eq("sourceStreamId", canonicalEntryId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .filter((q) => q.eq(q.field("eventTypeId"), eventTypeId))
          .filter((q) =>
            q.eq(q.field("sourceStreamTypeId"), sourceStreamTypeId),
          )
          .order("desc")
          .paginate(args.paginationOpts);
      } else if (eventTypeId) {
        page = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_namespace_sourceStream_time", (q) => {
            const prefix = q
              .eq("sourceNamespace", namespace)
              .eq("sourceStreamId", canonicalEntryId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .filter((q) => q.eq(q.field("eventTypeId"), eventTypeId))
          .order("desc")
          .paginate(args.paginationOpts);
      } else if (sourceStreamTypeId) {
        page = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_namespace_sourceStream_time", (q) => {
            const prefix = q
              .eq("sourceNamespace", namespace)
              .eq("sourceStreamId", canonicalEntryId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .filter((q) =>
            q.eq(q.field("sourceStreamTypeId"), sourceStreamTypeId),
          )
          .order("desc")
          .paginate(args.paginationOpts);
      } else {
        page = await ctx.db
          .query("unifiedTimeline")
          .withIndex("by_namespace_sourceStream_time", (q) => {
            const prefix = q
              .eq("sourceNamespace", namespace)
              .eq("sourceStreamId", canonicalEntryId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .order("desc")
          .paginate(args.paginationOpts);
      }

      return {
        ...page,
        page: await hydrateUnifiedTimelineRows(ctx, page.page),
      };
    }

    let page: PaginationResult<Doc<"unifiedTimeline">>;

    if (eventTypeId && sourceStreamTypeId) {
      page = await ctx.db
        .query("unifiedTimeline")
        .withIndex("by_namespace_eventType_time", (q) => {
          const prefix = q
            .eq("sourceNamespace", namespace)
            .eq("eventTypeId", eventTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .filter((q) => q.eq(q.field("sourceStreamTypeId"), sourceStreamTypeId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (eventTypeId) {
      page = await ctx.db
        .query("unifiedTimeline")
        .withIndex("by_namespace_eventType_time", (q) => {
          const prefix = q
            .eq("sourceNamespace", namespace)
            .eq("eventTypeId", eventTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (sourceStreamTypeId) {
      page = await ctx.db
        .query("unifiedTimeline")
        .withIndex("by_namespace_streamType_time", (q) => {
          const prefix = q
            .eq("sourceNamespace", namespace)
            .eq("sourceStreamTypeId", sourceStreamTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      page = await ctx.db
        .query("unifiedTimeline")
        .withIndex("by_namespace_eventTime", (q) => {
          const prefix = q.eq("sourceNamespace", namespace);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return {
      ...page,
      page: await hydrateUnifiedTimelineRows(ctx, page.page),
    };
  },
});

export const getUnifiedTimelineEvent = sessionQuery({
  args: { id: z.string() },
  handler: async (ctx: SessionQueryCtx, args: { id: string }) => {
    if (!ctx.account) return null;
    const expected = expectedAccountNamespace(ctx.account._id);
    const doc = await ctx.db.get(args.id as Id<"unifiedTimeline">);
    if (!doc || doc.sourceNamespace !== expected) return null;
    const [row] = await hydrateUnifiedTimelineRows(ctx, [doc]);
    return row;
  },
});

export const listUnifiedTimelineDimensionValues = sessionQuery({
  args: z.object({
    kind: z.enum(["eventType", "sourceStreamType"]),
  }),
  handler: async (ctx: SessionQueryCtx, args: { kind: DimensionKind }) => {
    if (!ctx.account) return [];
    const namespace = expectedAccountNamespace(ctx.account._id);
    return await ctx.db
      .query("unifiedTimelineDimensions")
      .withIndex("by_namespace_kind", (q) =>
        q.eq("namespace", namespace).eq("kind", args.kind),
      )
      .collect();
  },
});
