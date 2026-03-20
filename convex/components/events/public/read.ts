import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { query } from "../_generated/server";
import {
  eventEntryValidator,
  eventRefFields,
  streamRefFields,
} from "../internal/shared";
import { loadEvent } from "../internal/store";
import schema from "../schema";

export const getEvent = query({
  args: eventRefFields,
  returns: v.union(eventEntryValidator, v.null()),
  handler: async (ctx, args) => {
    return await loadEvent(ctx, args);
  },
});

export const listStreamEvents = query({
  args: {
    ...streamRefFields,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("event_entries")
      .withIndex("by_stream_version", (q) =>
        q.eq("streamType", args.streamType).eq("streamId", args.streamId),
      )
      .paginate(args.paginationOpts);
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
