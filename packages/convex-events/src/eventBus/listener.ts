import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { EventsClient } from "../client/index.js";
import type {
  EventEntry,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  RunMutationCtx,
  StreamTypeFor,
} from "../component/types.js";
import type {
  BusDimension,
  BusDimensionKind,
  BusEntry,
} from "./types.js";
import type { EvictionPolicy } from "./index.js";
import type { ExpectedDataModel, ExpectedId } from "./models/types.js";

type MutationCtx = GenericMutationCtx<ExpectedDataModel>;
type QueryCtx = GenericQueryCtx<ExpectedDataModel>;

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
      // The subscriber fires inside appendToStream's mutation, so the runtime
      // ctx is a full GenericMutationCtx even though the subscriber signature
      // only exposes RunMutationCtx (runMutation + runQuery).
      client.subscribe(`__bus_${key}`, (ctx, entry) =>
        this._onSourceEvent(ctx as unknown as MutationCtx, entry, key),
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
    ctx: MutationCtx,
    args: { namespace: string; kind: BusDimensionKind; value: string },
  ) {
    const now = Date.now();
    const existing = await ctx.db
      .query("eventBusDimensions")
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
    return await ctx.db.insert("eventBusDimensions", {
      namespace: args.namespace,
      kind: args.kind,
      value: args.value,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  private async _getOrCreateCount(ctx: MutationCtx) {
    const row = await ctx.db.query("eventBusCount").first();
    if (row) return row;
    const id = await ctx.db.insert("eventBusCount", { currentSize: 0 });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Failed to create event bus count");
    return created;
  }

  private async _onSourceEvent(
    ctx: MutationCtx,
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
        await cb(ctx, entry);
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
      await cb(ctx, entry);
    }
  }

  // ---------------------------------------------------------------------------
  // Read methods (run from query or mutation ctx)
  // ---------------------------------------------------------------------------

  async listEntries(
    ctx: QueryCtx,
    args: {
      namespace?: string;
      eventTypeId?: ExpectedId<"eventBusDimensions">;
      streamTypeId?: ExpectedId<"eventBusDimensions">;
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
    ctx: QueryCtx,
    args: { namespace?: string; kind: BusDimensionKind },
  ): Promise<BusDimension[]> {
    const namespace = normalizeNamespace(args.namespace);
    return await ctx.db
      .query("eventBusDimensions")
      .withIndex("by_namespace_kind_value", (q) =>
        q.eq("namespace", namespace).eq("kind", args.kind),
      )
      .collect();
  }

  async getOriginalEvent(
    ctx: { runQuery: RunMutationCtx["runQuery"] },
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
}
