import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { bus, events, fifoEvictionRules } from "./events";

const vStreamName = v.union(v.literal("todo"), v.literal("counter"));
const vTodoEventType = v.union(
  v.literal("created"),
  v.literal("completed"),
  v.literal("deleted"),
);
const vCounterEventType = v.union(
  v.literal("incremented"),
  v.literal("decremented"),
);

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

export const appendEvent = mutation({
  args: {
    name: vStreamName,
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.union(vTodoEventType, vCounterEventType),
    namespace: v.optional(v.string()),
    payload: v.optional(v.any()),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return events.appendToStream(ctx, args as any);
  },
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const listStreamEvents = query({
  args: {
    name: vStreamName,
    streamId: v.string(),
    namespace: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    return events.listStreamEvents(ctx, args);
  },
});

export const listStreamEventsSince = query({
  args: {
    name: vStreamName,
    streamId: v.string(),
    namespace: v.optional(v.string()),
    minEventTime: v.number(),
    paginationOpts: paginationOptsValidator,
    eventTypes: v.optional(v.array(v.string())),
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
  },
  handler: async (ctx, args) => {
    return events.listStreamEventsSince(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Dimensions (component-level)
// ---------------------------------------------------------------------------

export const listDimensions = query({
  args: {
    namespace: v.optional(v.string()),
    kind: v.union(v.literal("eventType"), v.literal("streamType")),
  },
  handler: async (ctx, args) => {
    return events.listDimensions(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export const getStream = query({
  args: {
    name: vStreamName,
    streamId: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return events.getStream(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export const getMetrics = query({
  args: {
    name: v.string(),
    groupKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return events.getBatch(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Projectors
// ---------------------------------------------------------------------------

export const readCheckpoint = query({
  args: {
    projector: v.string(),
    name: vStreamName,
  },
  handler: async (ctx, args) => {
    return events.readCheckpoint(ctx, args);
  },
});

export const listUnprocessed = query({
  args: {
    projector: v.string(),
    name: vStreamName,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return events.listUnprocessed(ctx, args);
  },
});

export const claimCheckpoint = mutation({
  args: {
    projector: v.string(),
    name: vStreamName,
  },
  handler: async (ctx, args) => {
    return events.claimOrReadCheckpoint(ctx, args);
  },
});

export const advanceCheckpoint = mutation({
  args: {
    projector: v.string(),
    name: vStreamName,
    lastSequence: v.number(),
  },
  handler: async (ctx, args) => {
    return events.advanceCheckpoint(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Bus
// ---------------------------------------------------------------------------

export const listBusEntries = query({
  args: {
    namespace: v.optional(v.string()),
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return bus.listEntries(ctx, args);
  },
});

export const listBusDimensions = query({
  args: {
    namespace: v.optional(v.string()),
    kind: v.union(v.literal("eventType"), v.literal("streamType")),
  },
  handler: async (ctx, args) => {
    return bus.listDimensions(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Throughput demo (FIFO buckets + eviction rule metadata)
// ---------------------------------------------------------------------------

export const listBusFifoBuckets = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("eventBusCount").collect();
    return rows.map((r) => ({
      bucketKey: r.bucketKey,
      currentSize: r.currentSize,
    }));
  },
});

export const getFifoEvictionRules = query({
  args: {},
  handler: async () => {
    return fifoEvictionRules.map((rule, ruleIndex) => ({
      ruleIndex,
      size: rule.size,
      match: rule.match,
      groupBy: rule.groupBy,
    }));
  },
});
