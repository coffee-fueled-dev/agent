import { defineTable } from "convex/server";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import type {
  EventEntry,
  EventsAppendHookCtx,
  EventSubscribable,
  EventSubscriber,
} from "./types";

// ---------------------------------------------------------------------------
// Eviction policy types
// ---------------------------------------------------------------------------

export type FifoPolicy = { type: "fifo"; options: { size: number } };
export type EvictionPolicy = FifoPolicy;

// ---------------------------------------------------------------------------
// Bus entry validator (shared across policies)
// ---------------------------------------------------------------------------

export const busEntryValidator = v.object({
  sourceKey: v.string(),
  streamType: v.string(),
  namespace: v.string(),
  streamId: v.string(),
  eventId: v.string(),
  eventType: v.string(),
  eventTime: v.number(),
  payload: v.optional(v.any()),
});

// ---------------------------------------------------------------------------
// FIFO tables
// ---------------------------------------------------------------------------

const fifoTables = {
  eventBusEntries: defineTable({
    sourceKey: v.string(),
    streamType: v.string(),
    namespace: v.string(),
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    eventTime: v.number(),
    payload: v.optional(v.any()),
  })
    .index("by_source_event", ["sourceKey", "eventId"])
    .index("by_time", ["eventTime"]),

  eventBusEvictionBuffer: defineTable({
    entryId: v.id("eventBusEntries"),
  }),

  eventBusCount: defineTable({
    currentSize: v.number(),
  }),
};

// ---------------------------------------------------------------------------
// EventBusDefinition
// ---------------------------------------------------------------------------

export type EventBusDefinition<Tables> = {
  tables: Tables;
  entryValidator: typeof busEntryValidator;
  evictionConfig: EvictionPolicy;
};

// ---------------------------------------------------------------------------
// Overloaded factory
// ---------------------------------------------------------------------------

export function createEventBus(config: {
  eviction: FifoPolicy;
}): EventBusDefinition<typeof fifoTables>;
export function createEventBus(config: { eviction: EvictionPolicy }) {
  if (config.eviction.type === "fifo") {
    return {
      tables: fifoTables,
      entryValidator: busEntryValidator,
      evictionConfig: config.eviction,
    } satisfies EventBusDefinition<typeof fifoTables>;
  }
  throw new Error(`Unknown eviction policy: ${(config.eviction as EvictionPolicy).type}`);
}

// ---------------------------------------------------------------------------
// EventBusListener
// ---------------------------------------------------------------------------

type EventBusSource = {
  client: EventSubscribable;
  key: string;
};

export class EventBusListener implements EventSubscribable {
  private _subscribers = new Map<string, EventSubscriber>();
  private _sourceMap = new Map<string, EventSubscribable>();

  constructor(
    private opts: {
      sources: EventBusSource[];
      writer: FunctionReference<"mutation", "internal">;
      eviction: EvictionPolicy;
    },
  ) {
    for (const { client, key } of opts.sources) {
      this._sourceMap.set(key, client);
      client.subscribe(`__bus_${key}`, (ctx, entry) =>
        this._onSourceEvent(ctx, entry, key),
      );
    }
  }

  subscribe(id: string, callback: EventSubscriber): void {
    this._subscribers.set(id, callback);
  }

  /**
   * Look up the original event in its source EventsClient table using
   * the `sourceKey` stored on the bus entry.
   */
  async getOriginalEvent(
    ctx: { runQuery: EventsAppendHookCtx["runQuery"] },
    busEntry: {
      sourceKey: string;
      streamType: string;
      namespace: string;
      streamId: string;
      eventId: string;
    },
  ): Promise<EventEntry | null> {
    const source = this._sourceMap.get(busEntry.sourceKey);
    if (!source) return null;
    if (!("read" in source)) return null;
    const client = source as EventSubscribable & {
      read: {
        getEvent: (
          ctx: { runQuery: EventsAppendHookCtx["runQuery"] },
          args: {
            streamType: string;
            namespace?: string;
            streamId: string;
            eventId: string;
          },
        ) => Promise<EventEntry | null>;
      };
    };
    return client.read.getEvent(ctx, {
      streamType: busEntry.streamType,
      namespace: busEntry.namespace,
      streamId: busEntry.streamId,
      eventId: busEntry.eventId,
    });
  }

  private async _onSourceEvent(
    ctx: EventsAppendHookCtx,
    entry: EventEntry,
    sourceKey: string,
  ) {
    await ctx.runMutation(this.opts.writer, {
      sourceKey,
      streamType: entry.streamType,
      namespace: entry.namespace,
      streamId: entry.streamId,
      eventId: entry.eventId,
      eventType: entry.eventType,
      eventTime: entry.eventTime,
      payload: entry.payload,
    });

    for (const cb of this._subscribers.values()) {
      await cb(ctx, entry);
    }
  }
}
