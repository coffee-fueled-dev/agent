import { v } from "convex/values";
import { memoryClient } from "../../../../_clients/memory.js";
import { internalAction } from "../../../../_generated/server.js";

export const execute = internalAction({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    minScore: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      memoryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      text: v.string(),
      score: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await memoryClient.searchMemory(ctx, {
      namespace: args.namespace,
      query: args.query,
      limit: args.limit,
      retrievalMode: args.retrievalMode,
      minScore: args.minScore,
    });
  },
});
