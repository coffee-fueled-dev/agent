import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";

/** TODO: port delete memory flow. */
export const execute = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, _args) => {
    throw new Error("deleteMemory: not yet ported to packages/backend — TODO");
  },
});
