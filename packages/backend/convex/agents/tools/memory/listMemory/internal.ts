import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";

/** TODO: wire MemoryClient list / pagination when host list API is ported. */
export const execute = internalAction({
  args: {
    namespace: v.string(),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    page: v.array(v.any()),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (_ctx, _args) => {
    throw new Error(
      "listMemory: pagination not yet ported to packages/backend; TODO",
    );
  },
});
