import type { EventsClient } from "../client/index.js";
import {
  fifoBucketKeyForRule,
  matchesRule,
} from "../domain/metrics/grouping.js";
import type {
  EventEntry,
  EventStreamTemplate,
  EventSubscribable,
  EventSubscriber,
  EventsMutationCtx,
  EventsRunQueryCtx,
  MetricMatchFields,
  StreamNameFor,
} from "../component/types.js";
import type {
  EvictionPolicy,
  FifoEvictionRule,
} from "./evictionPolicy.js";
import type { DimensionKind } from "../domain/dimensions/fields.js";
import { getOrCreateDimensionId } from "../domain/dimensions/helpers.js";
import type { DimensionDoc } from "../domain/dimensions/types.js";
import type { ExpectedId } from "./models/types.js";
import type {
  BusEntry,
  EventsBusMutationCtx,
  EventsBusQueryCtx,
} from "./types.js";

export type EventBusSource<
  Key extends string = string,
  Streams extends readonly EventStreamTemplate[] =
    // biome-ignore lint/suspicious/noExplicitAny: Invariant EventsClient; default must widen for heterogeneous sources.
    any,
> = {
  client: EventsClient<Streams>;
  key: Key;
};

type AnySource = EventBusSource<
  string,
  // biome-ignore lint/suspicious/noExplicitAny: Heterogeneous createEventBus sources.
  any
>;

type SourceKey<S extends readonly AnySource[]> = S[number]["key"];

type AllStreams<S extends readonly AnySource[]> =
  S[number] extends EventBusSource<string, infer Streams> ? Streams : never;

function normalizeNamespace(ns: string | undefined): string {
  return ns ?? "";
}

function entryShapeForGrouping(entry: EventEntry) {
  return {
    namespace: normalizeNamespace(entry.namespace),
    streamType: entry.name as string,
    streamId: entry.streamId,
    eventType: entry.eventType as string,
  };
}

export class EventBusListener<const Sources extends readonly AnySource[]>
  implements EventSubscribable
{
  private _subscribers = new Map<string, EventSubscriber>();
  private _sourceMap = new Map<string, Sources[number]["client"]>();
  private _evictionRules: readonly FifoEvictionRule[];

  constructor(config: {
    sources: Sources;
    eviction: EvictionPolicy;
  }) {
    if (config.eviction.type !== "fifo" || config.eviction.rules.length === 0) {
      throw new Error("EventBusListener: fifo eviction requires non-empty rules.");
    }
    this._evictionRules = config.eviction.rules;

    for (const { client, key } of config.sources) {
      this._sourceMap.set(key, client);
      client.subscribe(`__bus_${key}`, (ctx, entry) =>
        this._onSourceEvent(ctx as EventsBusMutationCtx, entry, key),
      );
    }
  }

  subscribe(id: string, callback: EventSubscriber): void {
    this._subscribers.set(id, callback);
  }

  private _selectEvictionRule(entry: EventEntry): {
    rule: FifoEvictionRule;
    ruleIndex: number;
  } {
    const e = entryShapeForGrouping(entry);
    for (let i = 0; i < this._evictionRules.length; i++) {
      const rule = this._evictionRules[i];
      if (
        matchesRule<readonly EventStreamTemplate[]>(
          rule.match as MetricMatchFields<readonly EventStreamTemplate[]>,
          e,
        )
      ) {
        return { rule, ruleIndex: i };
      }
    }
    throw new Error(
      `No FIFO eviction rule matched event (namespace=${e.namespace}, stream=${e.streamType}, eventType=${e.eventType}).`,
    );
  }

  private async _getOrCreateBucketCount(
    ctx: EventsBusMutationCtx,
    bucketKey: string,
  ) {
    const row = await ctx.db
      .query("eventBusCount")
      .withIndex("by_bucketKey", (q) => q.eq("bucketKey", bucketKey))
      .first();
    if (row) return row;
    const id = await ctx.db.insert("eventBusCount", {
      bucketKey,
      currentSize: 0,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Failed to create event bus bucket count");
    return created;
  }

  private async _getBucketCount(
    ctx: EventsBusMutationCtx,
    bucketKey: string,
  ) {
    return await ctx.db
      .query("eventBusCount")
      .withIndex("by_bucketKey", (q) => q.eq("bucketKey", bucketKey))
      .first();
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

  private async _onSourceEvent(
    ctx: EventsBusMutationCtx,
    entry: EventEntry,
    sourceKey: string,
  ) {
    const staged = await ctx.db.query("eventBusEvictionBuffer").collect();
    for (const buf of staged) {
      const row = await ctx.db.get(buf.entryId);
      if (row) {
        await ctx.db.delete(row._id);
        const bucketRow = await this._getBucketCount(ctx, row.fifoBucketKey);
        if (bucketRow && bucketRow.currentSize > 0) {
          await ctx.db.patch(bucketRow._id, {
            currentSize: bucketRow.currentSize - 1,
          });
        }
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
      for (const cb of this._subscribers.values()) {
        await cb(ctx as EventsMutationCtx, entry);
      }
      return;
    }

    const { rule, ruleIndex } = this._selectEvictionRule(entry);
    const e = entryShapeForGrouping(entry);
    const fifoBucketKey = fifoBucketKeyForRule(ruleIndex, rule.groupBy, e);

    const namespace = e.namespace;
    const eventTypeId = await this._getOrCreateDimension(ctx, {
      namespace,
      kind: "eventType",
      value: entry.eventType,
    });
    const streamTypeId = await this._getOrCreateDimension(ctx, {
      namespace,
      kind: "streamType",
      value: entry.name,
    });

    await ctx.db.insert("eventBusEntries", {
      sourceKey,
      streamType: entry.name,
      namespace,
      streamId: entry.streamId,
      eventId: entry.eventId,
      eventType: entry.eventType,
      eventTime: entry.eventTime,
      fifoBucketKey,
      payload: entry.payload,
      eventTypeId,
      streamTypeId,
    });

    const bucket = await this._getOrCreateBucketCount(ctx, fifoBucketKey);
    let nextSize = bucket.currentSize + 1;
    await ctx.db.patch(bucket._id, { currentSize: nextSize });

    while (nextSize > rule.size) {
      const oldest = await ctx.db
        .query("eventBusEntries")
        .withIndex("by_fifoBucketKey_time", (q) =>
          q.eq("fifoBucketKey", fifoBucketKey),
        )
        .order("asc")
        .first();
      if (!oldest) break;
      await ctx.db.delete(oldest._id);
      nextSize -= 1;
      await ctx.db.patch(bucket._id, { currentSize: nextSize });
    }

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
      name: StreamNameFor<AllStreams<Sources>>;
      namespace: string;
      streamId: string;
      eventId: string;
    },
  ): Promise<EventEntry<AllStreams<Sources>> | null> {
    const client = this._sourceMap.get(busEntry.sourceKey);
    if (!client) return null;
    return client.getEvent(ctx, {
      name: busEntry.name,
      namespace: busEntry.namespace,
      streamId: busEntry.streamId,
      eventId: busEntry.eventId,
    }) as Promise<EventEntry<AllStreams<Sources>> | null>;
  }
}
