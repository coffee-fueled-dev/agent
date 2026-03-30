import type { EventsClient } from "./client/index.js";
import type { ComponentApi } from "./component/_generated/component.js";
import type {
  EventEntry,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  EventsAppendHookCtx,
  StreamTypeFor,
} from "./types.js";

// ---------------------------------------------------------------------------
// Eviction policy types
// ---------------------------------------------------------------------------

export type FifoPolicy = { type: "fifo"; options: { size: number } };
export type EvictionPolicy = FifoPolicy;

// ---------------------------------------------------------------------------
// Source types
// ---------------------------------------------------------------------------

export type EventBusSource<
  Key extends string = string,
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  client: EventsClient<Streams>;
  key: Key;
};

type SourceKey<S extends readonly EventBusSource[]> = S[number]["key"];

type AllStreams<S extends readonly EventBusSource[]> =
  S[number] extends EventBusSource<string, infer Streams> ? Streams : never;

// ---------------------------------------------------------------------------
// EventBusListener
// ---------------------------------------------------------------------------

export class EventBusListener<const Sources extends readonly EventBusSource[]>
  implements EventSubscribable
{
  private _subscribers = new Map<string, EventSubscriber>();
  private _sourceMap = new Map<string, Sources[number]["client"]>();

  constructor(
    private component: ComponentApi,
    private config: {
      sources: Sources;
      eviction: EvictionPolicy;
    },
  ) {
    for (const { client, key } of config.sources) {
      this._sourceMap.set(key, client);
      client.subscribe(`__bus_${key}`, (ctx, entry) =>
        this._onSourceEvent(ctx, entry, key),
      );
    }
  }

  subscribe(id: string, callback: EventSubscriber): void {
    this._subscribers.set(id, callback);
  }

  async getOriginalEvent(
    ctx: { runQuery: EventsAppendHookCtx["runQuery"] },
    busEntry: {
      sourceKey: SourceKey<Sources>;
      streamType: StreamTypeFor<AllStreams<Sources>>;
      namespace: string;
      streamId: string;
      eventId: string;
    },
  ): Promise<EventEntry<AllStreams<Sources>> | null> {
    const client = this._sourceMap.get(busEntry.sourceKey);
    if (!client) return null;
    return client.read.getEvent(ctx, {
      streamType: busEntry.streamType,
      namespace: busEntry.namespace,
      streamId: busEntry.streamId,
      eventId: busEntry.eventId,
    }) as Promise<EventEntry<AllStreams<Sources>> | null>;
  }

  private async _onSourceEvent(
    ctx: EventsAppendHookCtx,
    entry: EventEntry,
    sourceKey: string,
  ) {
    const maxSize =
      this.config.eviction.type === "fifo"
        ? this.config.eviction.options.size
        : 1000;

    await ctx.runMutation(this.component.public.eventBus.writeBusEntry, {
      sourceKey,
      streamType: entry.streamType,
      namespace: entry.namespace,
      streamId: entry.streamId,
      eventId: entry.eventId,
      eventType: entry.eventType,
      eventTime: entry.eventTime,
      payload: entry.payload,
      maxSize,
    });

    for (const cb of this._subscribers.values()) {
      await cb(ctx, entry);
    }
  }
}
