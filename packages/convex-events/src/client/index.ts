import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AppendArgs,
  EventEntry,
  EventStreamState,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  EventsConfig,
  MetricGroupByField,
  MetricMatchFields,
  ProjectorCheckpoint,
  StreamTypeFor,
} from "../component/types.js";

type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

type StreamArgs<Streams extends readonly EventStreamTemplate[]> = {
  streamType: StreamTypeFor<Streams>;
  /** Omitted or empty = unscoped stream identity. */
  namespace?: string;
  streamId: string;
};

type EventArgs<Streams extends readonly EventStreamTemplate[]> =
  StreamArgs<Streams> & {
    eventId: string;
  };

function matchesRule(
  match: MetricMatchFields,
  entry: { namespace: string; streamType: string; eventType: string },
): boolean {
  if (match.namespace !== undefined && match.namespace !== entry.namespace)
    return false;
  if (match.streamType !== undefined && match.streamType !== entry.streamType)
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
  if (groupBy.length === 1) return entry[groupBy[0] as MetricGroupByField];
  return groupBy.map((f) => entry[f]).join("\0");
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

  private _assertRegisteredStream(streamType: string, eventType: string) {
    const streams = this.config.streams;
    if (streams.length === 0) return;
    const stream = streams.find((s) => s.streamType === streamType);
    if (!stream) {
      throw new Error(`Unknown event streamType "${streamType}".`);
    }
    if (
      stream.eventTypes.length > 0 &&
      !stream.eventTypes.includes(eventType)
    ) {
      throw new Error(
        `Unknown eventType "${eventType}" for streamType "${streamType}".`,
      );
    }
  }

  append = {
    appendToStream: async (
      ctx: RunMutationCtx,
      args: AppendArgs<Streams>,
    ): Promise<EventEntry<Streams>> => {
      this._assertRegisteredStream(
        args.streamType as string,
        args.eventType as string,
      );
      const entry = await ctx.runMutation(
        this.component.public.append.appendToStream,
        args,
      );
      const rules = this.config.metrics;
      if (rules && rules.length > 0) {
        const increments: {
          name: string;
          groupKey: string;
          eventTime: number;
        }[] = [];
        for (const rule of rules) {
          if (matchesRule(rule.match, entry)) {
            increments.push({
              name: rule.name,
              groupKey: buildGroupKey(rule.groupBy, entry),
              eventTime: entry.eventTime,
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
        await cb(ctx, entry);
      }
      return entry;
    },
  };

  read = {
    getEvent: async (
      ctx: RunQueryCtx,
      args: EventArgs<Streams>,
    ): Promise<EventEntry<Streams> | null> => {
      return await ctx.runQuery(this.component.public.read.getEvent, args);
    },

    listStreamEvents: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams> & {
        paginationOpts: PaginationOptions;
        order?: "asc" | "desc";
        eventTypes?: string[];
      },
    ): Promise<PaginationResult<EventEntry<Streams>>> => {
      return await ctx.runQuery(
        this.component.public.read.listStreamEvents,
        args,
      );
    },

    listStreamEventsSince: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams> & {
        minEventTime: number;
        eventTypes?: string[];
      },
    ): Promise<EventEntry<Streams>[]> => {
      return await ctx.runQuery(
        this.component.public.read.listStreamEventsSince,
        args,
      );
    },

    listCategoryEvents: async (
      ctx: RunQueryCtx,
      args: {
        streamType: StreamTypeFor<Streams>;
        paginationOpts: PaginationOptions;
      },
    ): Promise<PaginationResult<EventEntry<Streams>>> => {
      return await ctx.runQuery(
        this.component.public.read.listCategoryEvents,
        args,
      );
    },
  };

  streams = {
    getStream: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams>,
    ): Promise<EventStreamState<Streams> | null> => {
      return await ctx.runQuery(this.component.public.streams.getStream, args);
    },

    getVersion: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams>,
    ): Promise<number> => {
      return await ctx.runQuery(
        this.component.public.streams.getStreamVersion,
        args,
      );
    },
  };

  metrics = {
    getBatch: async (
      ctx: RunQueryCtx,
      args: { name: string; groupKeys: string[] },
    ): Promise<Record<string, { count: number; lastEventTime: number }>> => {
      return await ctx.runQuery(
        this.component.public.metrics.getMetricsBatch,
        args,
      );
    },
  };

  projectors = {
    claimOrReadCheckpoint: async (
      ctx: RunMutationCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        leaseOwner?: string;
        leaseDurationMs?: number;
      },
    ): Promise<{
      checkpoint: ProjectorCheckpoint<StreamTypeFor<Streams>>;
      claimed: boolean;
    }> => {
      return await ctx.runMutation(
        this.component.public.projectors.claimOrReadCheckpoint,
        args,
      );
    },

    advanceCheckpoint: async (
      ctx: RunMutationCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        lastSequence: number;
        leaseOwner?: string;
        releaseClaim?: boolean;
      },
    ): Promise<ProjectorCheckpoint<StreamTypeFor<Streams>>> => {
      const checkpoint = await ctx.runMutation(
        this.component.public.projectors.advanceCheckpoint,
        args,
      );
      return checkpoint;
    },

    readCheckpoint: async (
      ctx: RunQueryCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
      },
    ): Promise<ProjectorCheckpoint<StreamTypeFor<Streams>> | null> => {
      return await ctx.runQuery(
        this.component.public.projectors.readCheckpoint,
        args,
      );
    },

    listUnprocessed: async (
      ctx: RunQueryCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        limit?: number;
      },
    ): Promise<EventEntry<Streams>[]> => {
      return await ctx.runQuery(
        this.component.public.projectors.listUnprocessedEvents,
        args,
      );
    },
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
  ctx: RunMutationCtx,
  args: {
    projector: string;
    streamType: StreamTypeFor<Streams>;
    batchSize?: number;
    maxBatches?: number;
  },
): AsyncGenerator<EventEntry<Streams>[], void, undefined> {
  yield* projectorUnprocessedBatchesFromDeps(
    {
      claim: () =>
        client.projectors.claimOrReadCheckpoint(ctx, {
          projector: args.projector,
          streamType: args.streamType,
        }),
      list: (limit) =>
        client.projectors.listUnprocessed(ctx, {
          projector: args.projector,
          streamType: args.streamType,
          limit,
        }),
      advance: (lastSequence) =>
        client.projectors.advanceCheckpoint(ctx, {
          projector: args.projector,
          streamType: args.streamType,
          lastSequence,
        }),
    },
    { batchSize: args.batchSize, maxBatches: args.maxBatches },
  );
}
