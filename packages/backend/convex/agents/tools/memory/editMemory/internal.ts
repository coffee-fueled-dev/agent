import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";

/** TODO: port edit memory flow. */
export const execute = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    text: v.optional(v.string()),
    title: v.optional(v.string()),
    observationTime: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, _args) => {
    throw new Error("editMemory: not yet ported to packages/backend — TODO");
  },
});
