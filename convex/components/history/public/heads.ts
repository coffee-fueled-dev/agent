import { v } from "convex/values";
import { query } from "../_generated/server";
import { historyHeadValidator } from "../internal/shared";

export const listHeads = query({
  args: {
    streamType: v.string(),
    streamId: v.string(),
  },
  returns: v.array(historyHeadValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("history_heads")
      .withIndex("by_stream_entry", (q) =>
        q.eq("streamType", args.streamType).eq("streamId", args.streamId),
      )
      .collect();
  },
});
