import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server.js";
import { bus, events, MEMORY_OBSERVABILITY_STREAM_ID } from "./events.js";

const vStreamName = v.union(
  v.literal("toolPipeline"),
  v.literal("fingerprints"),
  v.literal("memory"),
);

/**
 * Lists events for a stream scoped to `userId` (stream `namespace`).
 * For `name: "memory"`, `streamId` defaults to per-user memory observability (not thread-scoped).
 * For `toolPipeline` / `fingerprints`, pass the chat `threadId` as `streamId`.
 */
export const listStreamEvents = query({
  args: {
    userId: v.string(),
    name: vStreamName,
    streamId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const streamId =
      args.streamId ??
      (args.name === "memory" ? MEMORY_OBSERVABILITY_STREAM_ID : undefined);
    if (streamId === undefined) {
      throw new Error("streamId is required when name is not memory");
    }
    return events.listStreamEvents(ctx, {
      name: args.name,
      streamId,
      namespace: args.userId,
      paginationOpts: args.paginationOpts,
      order: args.order,
    });
  },
});

/** FIFO bus mirror for the main observability event bus (`namespace` = `userId`). */
export const listBusEntries = query({
  args: {
    userId: v.string(),
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return bus.listEntries(ctx as never, {
      namespace: args.userId,
      eventTypeId: args.eventTypeId,
      streamTypeId: args.streamTypeId,
      limit: args.limit,
    });
  },
});
