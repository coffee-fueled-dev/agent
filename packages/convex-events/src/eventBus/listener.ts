import type { EventsClient } from "../client/index.js";
import type {
  EventEntry,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  EventsMutationCtx,
  EventsRunQueryCtx,
  StreamTypeFor,
} from "../component/types.js";
import type { DimensionKind } from "../domain/dimensions/fields.js";
import { getOrCreateDimensionId } from "../domain/dimensions/helpers.js";
import type { DimensionDoc } from "../domain/dimensions/types.js";
import type { EvictionPolicy } from "./index.js";
import type { ExpectedId } from "./models/types.js";
import type {
  BusEntry,
  EventsBusMutationCtx,
  EventsBusQueryCtx,
} from "./types.js";

export type EventBusSource<
  Key extends string = string,
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  client: EventsClient<Streams>;
  key: Key;
};

type AnySource = EventBusSource<string, any>;

type SourceKey<S extends readonly AnySource[]> = S[number]["key"];

type AllStreams<S extends readonly AnySource[]> =
  S[number] extends EventBusSource<string, infer Streams> ? Streams : never;

function normalizeNamespace(ns: string | undefined): string {
  return ns ?? "";
}

export class EventBusListener<const Sources extends readonly AnySource[]>
  implements EventSubscribable
{
  private _subscribers = new Map<string, EventSubscriber>();
  private _sourceMap = new Map<string, Sources[number]["client"]>();
  private _maxSize: number;

  constructor(config: {
    sources: Sources;
    eviction: EvictionPolicy;
  }) {
    this._maxSize =
      config.eviction.type === "fifo" ? config.eviction.options.size : 1000;

    for (const { client, key } of config.sources) {
      this._sourceMap.set(key, client);
      // Caller's ctx is `EventsMutationCtx`; bus rows need host `ExpectedDataModel`.
      client.subscribe(`__bus_${key}`, (ctx, entry) =>
        this._onSourceEvent(ctx as EventsBusMutationCtx, entry, key),
      );
    }
  }

  subscribe(id: string, callback: EventSubscriber): void {
    this._subscribers.set(id, callback);
  }

  // ---------------------------------------------------------------------------
  // Write internals (run inside the caller's mutation ctx)
  // ---------------------------------------------------------------------------

  private async _getOrCreateDimension(
    ctx: EventsBusMutationCtx,
    args: { namespace: string; kind: DimensionKind; value: string },
  ) {
    return getOrCreateDimensionId(ctx, args);
  }

  private async _getOrCreateCount(ctx: EventsBusMutationCtx) {
    const row = await ctx.db.query("eventBusCount").first();
    if (row) return row;
    const id = await ctx.db.insert("eventBusCount", { currentSize: 0 });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Failed to create event bus count");
    return created;
  }

  private async _onSourceEvent(
    ctx: EventsBusMutationCtx,
    entry: EventEntry,
    sourceKey: string,
  ) {
    const counter = await this._getOrCreateCount(ctx);

    const staged = await ctx.db.query("eventBusEvictionBuffer").collect();
    for (const buf of staged) {
      const row = await ctx.db.get(buf.entryId);
      if (row) {
        await ctx.db.delete(row._id);
        counter.currentSize--;
      }
      await ctx.db.delete(buf._id);
    }

    const existing = await ctx.db
      .query("eventBusEntries")
      .withIndex("by_source_event", (q) =>
        q.eq("sourceKey", sourceKey).eq("eventId", entry.eventId),
      )
      .first();
    if (existing) {
      if (staged.length > 0) {
        await ctx.db.patch(counter._id, { currentSize: counter.currentSize });
      }
      for (const cb of this._subscribers.values()) {
        await cb(ctx as EventsMutationCtx, entry);
      }
      return;
    }

    const namespace = normalizeNamespace(entry.namespace);
    const eventTypeId = await this._getOrCreateDimension(ctx, {
      namespace,
      kind: "eventType",
      value: entry.eventType,
    });
    const streamTypeId = await this._getOrCreateDimension(ctx, {
      namespace,
      kind: "streamType",
      value: entry.streamType,
    });

    await ctx.db.insert("eventBusEntries", {
      sourceKey,
      streamType: entry.streamType,
      namespace,
      streamId: entry.streamId,
      eventId: entry.eventId,
      eventType: entry.eventType,
      eventTime: entry.eventTime,
      payload: entry.payload,
      eventTypeId,
      streamTypeId,
    });
    counter.currentSize++;

    if (counter.currentSize >= this._maxSize) {
      const oldest = await ctx.db
        .query("eventBusEntries")
        .withIndex("by_time")
        .order("asc")
        .first();
      if (oldest) {
        await ctx.db.insert("eventBusEvictionBuffer", {
          entryId: oldest._id,
        });
      }
    }

    await ctx.db.patch(counter._id, { currentSize: counter.currentSize });

    for (const cb of this._subscribers.values()) {
      await cb(ctx as EventsMutationCtx, entry);
    }
  }

  // ---------------------------------------------------------------------------
  // Read methods (run from query or mutation ctx)
  // ---------------------------------------------------------------------------

  async listEntries(
    ctx: EventsBusQueryCtx,
    args: {
      namespace?: string;
      eventTypeId?: ExpectedId<"dimensions">;
      streamTypeId?: ExpectedId<"dimensions">;
      eventTimeMin?: number;
      eventTimeMax?: number;
      limit?: number;
    },
  ): Promise<BusEntry[]> {
    const namespace = normalizeNamespace(args.namespace);
    const minT = args.eventTimeMin;
    const maxT = args.eventTimeMax;
    const eventTypeId = args.eventTypeId;
    const streamTypeId = args.streamTypeId;
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));

    if (eventTypeId) {
      let results = await ctx.db
        .query("eventBusEntries")
        .withIndex("by_namespace_eventType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("eventTypeId", eventTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .take(limit * 2);
      if (streamTypeId) {
        results = results.filter((r) => r.streamTypeId === streamTypeId);
      }
      return results.slice(0, limit);
    }

    if (streamTypeId) {
      return await ctx.db
        .query("eventBusEntries")
        .withIndex("by_namespace_streamType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("streamTypeId", streamTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("eventBusEntries")
      .withIndex("by_namespace_time", (q) => {
        const prefix = q.eq("namespace", namespace);
        if (minT != null && maxT != null)
          return prefix.gte("eventTime", minT).lte("eventTime", maxT);
        if (minT != null) return prefix.gte("eventTime", minT);
        if (maxT != null) return prefix.lte("eventTime", maxT);
        return prefix;
      })
      .order("desc")
      .take(limit);
  }

  async listDimensions(
    ctx: EventsBusQueryCtx,
    args: { namespace?: string; kind: DimensionKind },
  ): Promise<DimensionDoc[]> {
    const namespace = normalizeNamespace(args.namespace);
    return await ctx.db
      .query("dimensions")
      .withIndex("by_namespace_kind_value", (q) =>
        q.eq("namespace", namespace).eq("kind", args.kind),
      )
      .collect();
  }

  async getOriginalEvent(
    ctx: EventsRunQueryCtx,
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
    return client.getEvent(ctx, {
      streamType: busEntry.streamType,
      namespace: busEntry.namespace,
      streamId: busEntry.streamId,
      eventId: busEntry.eventId,
    }) as Promise<EventEntry<AllStreams<Sources>> | null>;
  }
}
