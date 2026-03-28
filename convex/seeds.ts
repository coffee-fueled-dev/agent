import { mutation } from "./_generated/server";
import { ensureHumanAccount, issueAccountToken } from "./lib/auth";

/** Public so dev scripts (ConvexHttpClient) can mint a token; not used by the telemetry UI. */
export const seedRootAccountToken = mutation({
  args: {},
  handler: async (ctx) => {
    const account = await ensureHumanAccount(ctx, {
      displayName: "Root User",
    });
    return await issueAccountToken(ctx, {
      account: account._id,
    });
  },
});
