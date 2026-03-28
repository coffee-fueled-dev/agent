import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { ensureMachineAccount } from "./lib/auth";
import { Session } from "./resolvers/auth";

/** Resolve linked account for a convex-helpers session id (for sessionAction handlers). */
export const getAccountIdForConvexSession = internalQuery({
  args: { convexSessionId: v.string() },
  returns: v.union(v.id("accounts"), v.null()),
  handler: async (ctx, { convexSessionId }) => {
    const session = await Session.query(ctx)
      .withIndex("by_convexSessionId", (q) =>
        q.eq("convexSessionId", convexSessionId),
      )
      .first();
    if (!session?.account) return null;
    return session.account;
  },
});

export const ensureMachineAccountInternal = internalMutation({
  args: { codeId: v.string(), name: v.string() },
  returns: v.object({ accountId: v.id("accounts") }),
  handler: async (ctx, args) => {
    const acc = await ensureMachineAccount(ctx, args);
    return { accountId: acc._id };
  },
});
