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
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
  },
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    const types = args.eventTypes;
    const hasTypes = Boolean(types?.length);
    const etId = args.eventTypeId;
    const stId = args.streamTypeId;
    const hasDimensionFilter = Boolean(etId || stId);

    const baseChain = paginator(ctx.db, schema)
      .query("event_entries")
      .withIndex("by_stream_version", (q) =>
        q
          .eq("streamType", args.streamType)
          .eq("namespace", namespace)
          .eq("streamId", args.streamId),
      );

    const chain = args.order === "desc" ? baseChain.order("desc") : baseChain;

    if (hasTypes && types) {
      const typedChain = chain.filterWith(
        async (doc: { eventType?: string }) =>
          types.length === 1
            ? doc.eventType === types[0]
            : doc.eventType !== undefined && types.includes(doc.eventType),
      );
      if (hasDimensionFilter) {
        return await typedChain
          .filterWith(
            async (doc: { eventTypeId?: string; streamTypeId?: string }) => {
              if (etId && doc.eventTypeId !== etId) return false;
              if (stId && doc.streamTypeId !== stId) return false;
              return true;
            },
          )
          .paginate(args.paginationOpts);
      }
      return await typedChain.paginate(args.paginationOpts);
    }

    if (hasDimensionFilter) {
      return await chain
        .filterWith(
          async (doc: { eventTypeId?: string; streamTypeId?: string }) => {
            if (etId && doc.eventTypeId !== etId) return false;
            if (stId && doc.streamTypeId !== stId) return false;
            return true;
          },
        )
        .paginate(args.paginationOpts);
    }

    return await chain.paginate(args.paginationOpts);
  },
});

export const listStreamEventsSince = query({
  args: {
    ...streamRefFields,
    minEventTime: v.number(),
    paginationOpts: paginationOptsValidator,
    eventTypes: v.optional(v.array(v.string())),
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
  },
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    const types = args.eventTypes;
    const hasTypes = Boolean(types?.length);
    const etId = args.eventTypeId;
    const stId = args.streamTypeId;
    const hasDimensionFilter = Boolean(etId || stId);

    const chain = paginator(ctx.db, schema)
      .query("event_entries")
      .withIndex("by_stream_event_time", (q) =>
        q
          .eq("streamType", args.streamType)
          .eq("namespace", namespace)
          .eq("streamId", args.streamId)
          .gte("eventTime", args.minEventTime),
      );

    if (hasTypes && types) {
      const typedChain = chain.filterWith(
        async (doc: { eventType?: string }) =>
          types.length === 1
            ? doc.eventType === types[0]
            : doc.eventType !== undefined && types.includes(doc.eventType),
      );
      if (hasDimensionFilter) {
        return await typedChain
          .filterWith(
            async (doc: { eventTypeId?: string; streamTypeId?: string }) => {
              if (etId && doc.eventTypeId !== etId) return false;
              if (stId && doc.streamTypeId !== stId) return false;
              return true;
            },
          )
          .paginate(args.paginationOpts);
      }
      return await typedChain.paginate(args.paginationOpts);
    }

    if (hasDimensionFilter) {
      return await chain
        .filterWith(
          async (doc: { eventTypeId?: string; streamTypeId?: string }) => {
            if (etId && doc.eventTypeId !== etId) return false;
            if (stId && doc.streamTypeId !== stId) return false;
            return true;
          },
        )
        .paginate(args.paginationOpts);
    }

    return await chain.paginate(args.paginationOpts);
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
