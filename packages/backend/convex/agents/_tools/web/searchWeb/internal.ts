import { Browserbase } from "@browserbasehq/sdk";
import { internalAction } from "_generated/server.js";
import { v } from "convex/values";
import { requireBrowserbaseApiKey } from "env/browserbase.js";

export const execute = internalAction({
  args: {
    query: v.string(),
    numResults: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const apiKey = requireBrowserbaseApiKey();
    const bb = new Browserbase({ apiKey });
    return await bb.search.web({
      query: args.query,
      numResults: args.numResults,
    });
  },
});
