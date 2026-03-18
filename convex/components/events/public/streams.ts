import { v } from "convex/values";
import { query } from "../_generated/server";
import { streamRefFields, streamStateValidator } from "../internal/shared";
import { loadStream } from "../internal/store";

export const getStream = query({
  args: streamRefFields,
  returns: v.union(streamStateValidator, v.null()),
  handler: async (ctx, args) => {
    return await loadStream(ctx, args);
  },
});

export const getStreamVersion = query({
  args: streamRefFields,
  returns: v.number(),
  handler: async (ctx, args) => {
    return (await loadStream(ctx, args))?.version ?? 0;
  },
});
