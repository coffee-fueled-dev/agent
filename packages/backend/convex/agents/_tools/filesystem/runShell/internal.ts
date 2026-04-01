import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";

/** TODO: port local shell execution from main app. */
export const execute = internalAction({
  args: {
    command: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, _args) => {
    throw new Error(
      "runShell: not yet ported to packages/backend (HTTP/local executor) — TODO",
    );
  },
});
