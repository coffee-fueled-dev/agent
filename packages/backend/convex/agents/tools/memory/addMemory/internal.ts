import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";

/** TODO: port add memory flow (upsertMemory via MemoryClient). */
export const execute = internalAction({
  args: {
    namespace: v.string(),
    text: v.string(),
    title: v.optional(v.string()),
    observationTime: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, _args) => {
    throw new Error(
      "addMemory: not yet ported to packages/backend; use MemoryClient.upsertMemory — TODO",
    );
  },
});
