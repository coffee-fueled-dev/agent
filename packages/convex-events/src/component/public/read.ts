import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { query } from "../_generated/server.js";
import {
  eventEntryValidator,
  eventRefFields,
  normalizeStreamNamespace,
  streamRefFields,
} from "../internal/shared.js";
import { loadEvent } from "../internal/store.js";
import schema from "../schema.js";

export const getEvent = query({
  args: eventRefFields,
  returns: v.union(eventEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    return await loadEvent(ctx, { ...args, namespace });
  },
});

export const listStreamEvents = query({
  args: {
    ...streamRefFields,
    paginationOpts: paginationOptsValidator,
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    eventTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    const types = args.eventTypes;
    const hasTypes = types && types.length > 0;

    const indexChain = () =>
      paginator(ctx.db, schema)
        .query("event_entries")
        .withIndex("by_stream_version", (q) =>
          q
            .eq("streamType", args.streamType)
            .eq("namespace", namespace)
            .eq("streamId", args.streamId),
        );

    /** convex-helpers paginator streams do not support `.filter()`; use `.filterWith()` (see stream.js). */
    const filterByEventTypes =
      (t: string[]) => async (doc: { eventType: string }) =>
        t.length === 1 ? doc.eventType === t[0] : t.includes(doc.eventType);

    if (args.order === "desc") {
      const chain = hasTypes
        ? indexChain()
            .order("desc")
            .filterWith(async (doc) => filterByEventTypes(types)(doc))
        : indexChain().order("desc");
      return await chain.paginate(args.paginationOpts);
    }

    if (hasTypes) {
      return await indexChain()
        .filterWith(async (doc) => filterByEventTypes(types)(doc))
        .paginate(args.paginationOpts);
    }

    return await indexChain().paginate(args.paginationOpts);
  },
});

export const listStreamEventsSince = query({
  args: {
    ...streamRefFields,
    minEventTime: v.number(),
    eventTypes: v.optional(v.array(v.string())),
  },
  returns: v.array(eventEntryValidator),
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    // Use by_stream_event_time so we range-scan from minEventTime instead of
    // scanning the entire stream (by_stream_version + filter timed out on large streams).
    const base = ctx.db
      .query("event_entries")
      .withIndex("by_stream_event_time", (q) =>
        q
          .eq("streamType", args.streamType)
          .eq("namespace", namespace)
          .eq("streamId", args.streamId)
          .gte("eventTime", args.minEventTime),
      );
    const types = args.eventTypes;
    if (!types?.length) {
      return await base.collect();
    }
    return await base
      .filter((q) =>
        types.length === 1
          ? q.eq(q.field("eventType"), types[0] as string)
          : q.or(...types.map((t) => q.eq(q.field("eventType"), t))),
      )
      .collect();
  },
});

export const listCategoryEvents = query({
  args: {
    streamType: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("event_entries")
      .withIndex("by_type_sequence", (q) => q.eq("streamType", args.streamType))
      .paginate(args.paginationOpts);
  },
});
