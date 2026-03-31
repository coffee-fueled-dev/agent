import type { PaginationOptions, PaginationResult } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AppendArgs,
  EventEntry,
  EventStreamState,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  EventsConfig,
  EventsMutationCtx,
  EventsRunMutationCtx,
  EventsRunQueryCtx,
  MetricGroupByField,
  MetricMatchFields,
  ProjectorCheckpoint,
  StreamNameFor,
} from "../component/types.js";

type StreamArgs<Streams extends readonly EventStreamTemplate[]> = {
  name: StreamNameFor<Streams>;
  /** Omitted or empty = unscoped stream identity. */
  namespace?: string;
  streamId: string;
};

type EventArgs<Streams extends readonly EventStreamTemplate[]> =
  StreamArgs<Streams> & {
    eventId: string;
  };

function toPublicEntry<Streams extends readonly EventStreamTemplate[]>(
  doc: { streamType: string } & Record<string, unknown>,
): EventEntry<Streams> {
  const { streamType, ...rest } = doc;
  return { ...rest, name: streamType } as unknown as EventEntry<Streams>;
}

function toPublicStreamState<Streams extends readonly EventStreamTemplate[]>(
  doc: ({ streamType: string } & Record<string, unknown>) | null,
): EventStreamState<Streams> | null {
  if (!doc) return null;
  const { streamType, ...rest } = doc;
  return { ...rest, name: streamType } as unknown as EventStreamState<Streams>;
}

function toPublicCheckpoint<Streams extends readonly EventStreamTemplate[]>(
  doc: { streamType: string } & Record<string, unknown>,
): ProjectorCheckpoint<StreamNameFor<Streams>> {
  const { streamType, ...rest } = doc;
  return { ...rest, name: streamType } as unknown as ProjectorCheckpoint<
    StreamNameFor<Streams>
  >;
}

function mapPage<Streams extends readonly EventStreamTemplate[]>(
  page: PaginationResult<{ streamType: string } & Record<string, unknown>>,
): PaginationResult<EventEntry<Streams>> {
  return {
    ...page,
    page: page.page.map((d) => toPublicEntry<Streams>(d)),
  };
}

function matchesRule<Streams extends readonly EventStreamTemplate[]>(
  match: MetricMatchFields<Streams>,
  entry: { namespace: string; streamType: string; eventType: string },
): boolean {
  if (match.namespace !== undefined && match.namespace !== entry.namespace)
    return false;
  if (match.name !== undefined && match.name !== entry.streamType)
    return false;
  if (match.eventType !== undefined && match.eventType !== entry.eventType)
    return false;
  return true;
}

function buildGroupKey(
  groupBy: MetricGroupByField[],
  entry: {
    namespace: string;
    streamType: string;
    streamId: string;
    eventType: string;
  },
): string {
  const map: Record<MetricGroupByField, string> = {
    namespace: entry.namespace,
    name: entry.streamType,
    streamId: entry.streamId,
    eventType: entry.eventType,
  };
  if (groupBy.length === 1) return map[groupBy[0] as MetricGroupByField];
  return groupBy.map((f) => map[f as MetricGroupByField]).join("\0");
}

export class EventsClient<const Streams extends readonly EventStreamTemplate[]>
  implements EventSubscribable
{
  private _subscribers = new Map<string, EventSubscriber>();

  constructor(
    public component: ComponentApi,
    public config: EventsConfig<Streams>,
  ) {}

  subscribe(id: string, callback: EventSubscriber): void {
    this._subscribers.set(id, callback);
  }

  private _assertRegisteredStream(streamName: string, eventType: string) {
    const streams = this.config.streams;
    if (streams.length === 0) return;
    const stream = streams.find((s) => s.name === streamName);
    if (!stream) {
      throw new Error(`Unknown event stream name "${streamName}".`);
    }
    const keys = Object.keys(stream.events);
    if (keys.length > 0 && !keys.includes(eventType)) {
      throw new Error(
        `Unknown eventType "${eventType}" for stream "${streamName}".`,
      );
    }
  }

  appendToStream = async (
    ctx: EventsMutationCtx,
    args: AppendArgs<Streams>,
  ): Promise<EventEntry<Streams>> => {
    this._assertRegisteredStream(
      args.name as string,
      args.eventType as string,
    );
    const { name, ...rest } = args as AppendArgs<Streams> & { name: string };
    const entryRaw = await ctx.runMutation(
      this.component.public.append.appendToStream,
      { ...rest, streamType: name },
    );
    const entry = toPublicEntry<Streams>(entryRaw);
    const rules = this.config.counters;
    if (rules && rules.length > 0) {
      const increments: {
        name: string;
        groupKey: string;
        eventTime: number;
      }[] = [];
      for (const rule of rules) {
        if (matchesRule<Streams>(rule.match, entryRaw)) {
          increments.push({
            name: rule.name,
            groupKey: buildGroupKey(rule.groupBy, entryRaw),
            eventTime: entryRaw.eventTime,
          });
        }
      }
      if (increments.length > 0) {
        await ctx.runMutation(this.component.public.metrics.incrementBatch, {
          increments,
        });
      }
    }
    for (const cb of this._subscribers.values()) {
      await cb(
        ctx,
        entry as EventEntry<readonly EventStreamTemplate[]>,
      );
    }
    return entry;
  };

  getEvent = async (
    ctx: EventsRunQueryCtx,
    args: EventArgs<Streams>,
  ): Promise<EventEntry<Streams> | null> => {
    const { name, ...rest } = args;
    const raw = await ctx.runQuery(this.component.public.read.getEvent, {
      ...rest,
      streamType: name,
    });
    return raw ? toPublicEntry<Streams>(raw) : null;
  };

  listStreamEvents = async (
    ctx: EventsRunQueryCtx,
    args: StreamArgs<Streams> & {
      paginationOpts: PaginationOptions;
      order?: "asc" | "desc";
      eventTypes?: string[];
    },
  ): Promise<PaginationResult<EventEntry<Streams>>> => {
    const { name, ...rest } = args;
    const result = await ctx.runQuery(
      this.component.public.read.listStreamEvents,
      { ...rest, streamType: name },
    );
    return mapPage<Streams>(result);
  };

  listStreamEventsSince = async (
    ctx: EventsRunQueryCtx,
    args: StreamArgs<Streams> & {
      minEventTime: number;
      paginationOpts: PaginationOptions;
      eventTypes?: string[];
      eventTypeId?: string;
      streamTypeId?: string;
    },
  ): Promise<PaginationResult<EventEntry<Streams>>> => {
    const { name, ...rest } = args;
    const result = await ctx.runQuery(
      this.component.public.read.listStreamEventsSince,
      { ...rest, streamType: name },
    );
    return mapPage<Streams>(result);
  };

  listCategoryEvents = async (
    ctx: EventsRunQueryCtx,
    args: {
      name: StreamNameFor<Streams>;
      paginationOpts: PaginationOptions;
    },
  ): Promise<PaginationResult<EventEntry<Streams>>> => {
    const result = await ctx.runQuery(
      this.component.public.read.listCategoryEvents,
      {
        streamType: args.name,
        paginationOpts: args.paginationOpts,
      },
    );
    return mapPage<Streams>(result);
  };

  listDimensions = async (
    ctx: EventsRunQueryCtx,
    args: { namespace?: string; kind: "eventType" | "streamType" },
  ): Promise<unknown[]> => {
    return await ctx.runQuery(
      this.component.public.dimensions.listDimensions,
      args,
    );
  };

  getStream = async (
    ctx: EventsRunQueryCtx,
    args: StreamArgs<Streams>,
  ): Promise<EventStreamState<Streams> | null> => {
    const raw = await ctx.runQuery(this.component.public.streams.getStream, {
      streamType: args.name,
      namespace: args.namespace,
      streamId: args.streamId,
    });
    return toPublicStreamState<Streams>(raw);
  };

  getVersion = async (
    ctx: EventsRunQueryCtx,
    args: StreamArgs<Streams>,
  ): Promise<number> => {
    return await ctx.runQuery(
      this.component.public.streams.getStreamVersion,
      {
        streamType: args.name,
        namespace: args.namespace,
        streamId: args.streamId,
      },
    );
  };

  getBatch = async (
    ctx: EventsRunQueryCtx,
    args: { name: string; groupKeys: string[] },
  ): Promise<Record<string, { count: number; lastEventTime: number }>> => {
    return await ctx.runQuery(
      this.component.public.metrics.getMetricsBatch,
      args,
    );
  };

  claimOrReadCheckpoint = async (
    ctx: EventsRunMutationCtx,
    args: {
      projector: string;
      name: StreamNameFor<Streams>;
      leaseOwner?: string;
      leaseDurationMs?: number;
    },
  ): Promise<{
    checkpoint: ProjectorCheckpoint<StreamNameFor<Streams>>;
    claimed: boolean;
  }> => {
    const raw = await ctx.runMutation(
      this.component.public.projectors.claimOrReadCheckpoint,
      {
        projector: args.projector,
        streamType: args.name,
        leaseOwner: args.leaseOwner,
        leaseDurationMs: args.leaseDurationMs,
      },
    );
    return {
      checkpoint: toPublicCheckpoint<Streams>(raw.checkpoint),
      claimed: raw.claimed,
    };
  };

  advanceCheckpoint = async (
    ctx: EventsRunMutationCtx,
    args: {
      projector: string;
      name: StreamNameFor<Streams>;
      lastSequence: number;
      leaseOwner?: string;
      releaseClaim?: boolean;
    },
  ): Promise<ProjectorCheckpoint<StreamNameFor<Streams>>> => {
    const checkpoint = await ctx.runMutation(
      this.component.public.projectors.advanceCheckpoint,
      {
        projector: args.projector,
        streamType: args.name,
        lastSequence: args.lastSequence,
        leaseOwner: args.leaseOwner,
        releaseClaim: args.releaseClaim,
      },
    );
    return toPublicCheckpoint<Streams>(checkpoint);
  };

  readCheckpoint = async (
    ctx: EventsRunQueryCtx,
    args: {
      projector: string;
      name: StreamNameFor<Streams>;
    },
  ): Promise<ProjectorCheckpoint<StreamNameFor<Streams>> | null> => {
    const raw = await ctx.runQuery(
      this.component.public.projectors.readCheckpoint,
      {
        projector: args.projector,
        streamType: args.name,
      },
    );
    return raw ? toPublicCheckpoint<Streams>(raw) : null;
  };

  listUnprocessed = async (
    ctx: EventsRunQueryCtx,
    args: {
      projector: string;
      name: StreamNameFor<Streams>;
      limit?: number;
    },
  ): Promise<EventEntry<Streams>[]> => {
    const raw = await ctx.runQuery(
      this.component.public.projectors.listUnprocessedEvents,
      {
        projector: args.projector,
        streamType: args.name,
        limit: args.limit,
      },
    );
    return raw.map((d) => toPublicEntry<Streams>(d));
  };
}

/**
 * Batched indexed reads over the projector checkpoint + `listUnprocessedEvents`
 * path (same semantics as manual claim → list → advance). Each `yield` is one
 * batch; checkpoint advances after the consumer finishes processing that batch
 * (when the generator resumes). Not a reactive subscription — each step is a
 * bounded `runQuery` / `runMutation` round-trip.
 */
export async function* projectorUnprocessedBatchesFromDeps<
  Streams extends readonly EventStreamTemplate[],
>(
  deps: {
    claim: () => Promise<unknown>;
    list: (limit: number) => Promise<EventEntry<Streams>[]>;
    advance: (lastSequence: number) => Promise<unknown>;
  },
  options: { batchSize?: number; maxBatches?: number },
): AsyncGenerator<EventEntry<Streams>[], void, undefined> {
  const batchSize = Math.min(Math.max(1, options.batchSize ?? 100), 500);
  await deps.claim();
  let batches = 0;
  while (options.maxBatches === undefined || batches < options.maxBatches) {
    const batch = await deps.list(batchSize);
    if (batch.length === 0) break;
    yield batch;
    let maxSeq = 0;
    for (const ev of batch) {
      maxSeq = Math.max(maxSeq, ev.globalSequence);
    }
    await deps.advance(maxSeq);
    batches++;
  }
}

export async function* projectorUnprocessedBatches<
  const Streams extends readonly EventStreamTemplate[],
>(
  client: EventsClient<Streams>,
  ctx: EventsRunMutationCtx,
  args: {
    projector: string;
    name: StreamNameFor<Streams>;
    batchSize?: number;
    maxBatches?: number;
  },
): AsyncGenerator<EventEntry<Streams>[], void, undefined> {
  yield* projectorUnprocessedBatchesFromDeps(
    {
      claim: () =>
        client.claimOrReadCheckpoint(ctx, {
          projector: args.projector,
          name: args.name,
        }),
      list: (limit) =>
        client.listUnprocessed(ctx, {
          projector: args.projector,
          name: args.name,
          limit,
        }),
      advance: (lastSequence) =>
        client.advanceCheckpoint(ctx, {
          projector: args.projector,
          name: args.name,
          lastSequence,
        }),
    },
    { batchSize: args.batchSize, maxBatches: args.maxBatches },
  );
}
