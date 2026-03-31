import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { bus, events } from "./events";

const vStreamType = v.union(v.literal("todo"), v.literal("counter"));
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
    streamType: vStreamType,
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.union(vTodoEventType, vCounterEventType),
    namespace: v.optional(v.string()),
    payload: v.optional(v.any()),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return events.append.appendToStream(ctx, args as any);
  },
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const listStreamEvents = query({
  args: {
    streamType: vStreamType,
    streamId: v.string(),
    namespace: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    return events.read.listStreamEvents(ctx, args);
  },
});

export const listStreamEventsSince = query({
  args: {
    streamType: vStreamType,
    streamId: v.string(),
    namespace: v.optional(v.string()),
    minEventTime: v.number(),
  },
  handler: async (ctx, args) => {
    return events.read.listStreamEventsSince(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export const getStream = query({
  args: {
    streamType: vStreamType,
    streamId: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return events.streams.getStream(ctx, args);
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
    return events.metrics.getBatch(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Projectors
// ---------------------------------------------------------------------------

export const readCheckpoint = query({
  args: {
    projector: v.string(),
    streamType: vStreamType,
  },
  handler: async (ctx, args) => {
    return events.projectors.readCheckpoint(ctx, args);
  },
});

export const listUnprocessed = query({
  args: {
    projector: v.string(),
    streamType: vStreamType,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return events.projectors.listUnprocessed(ctx, args);
  },
});

export const claimCheckpoint = mutation({
  args: {
    projector: v.string(),
    streamType: vStreamType,
  },
  handler: async (ctx, args) => {
    return events.projectors.claimOrReadCheckpoint(ctx, args);
  },
});

export const advanceCheckpoint = mutation({
  args: {
    projector: v.string(),
    streamType: vStreamType,
    lastSequence: v.number(),
  },
  handler: async (ctx, args) => {
    return events.projectors.advanceCheckpoint(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Bus
// ---------------------------------------------------------------------------

export const listBusEntries = query({
  args: {
    namespace: v.optional(v.string()),
    eventTypeId: v.optional(v.id("eventBusDimensions")),
    streamTypeId: v.optional(v.id("eventBusDimensions")),
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
