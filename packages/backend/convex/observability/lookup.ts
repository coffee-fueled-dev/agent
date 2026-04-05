import { v } from "convex/values";
import { components } from "../_generated/api.js";
import { internalQuery } from "../_generated/server.js";

/** Resolve Convex Agent thread owner for observability namespace (`userId`). */
export const getUserIdForThread = internalQuery({
  args: { threadId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId as never,
    });
    return thread?.userId ?? null;
  },
});
