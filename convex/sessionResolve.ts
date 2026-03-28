import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { ensureMachineAccount, ensureTokenAccount } from "./lib/auth";
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

/**
 * Session actions do not run `resolveOrCreateSession`, so `sessions.account` may be unset.
 * `sessionMutation` may also link a *session-scoped* account first; chat threads use the
 * **token** account (`createThread`). This mutation aligns `sessions.account` with the token account.
 */
export const ensureSessionAccountFromToken = internalMutation({
  args: { convexSessionId: v.string(), token: v.string() },
  returns: v.id("accounts"),
  handler: async (ctx, { convexSessionId, token }) => {
    const account = await ensureTokenAccount(ctx, token);
    const session = await Session.query(ctx)
      .withIndex("by_convexSessionId", (q) =>
        q.eq("convexSessionId", convexSessionId),
      )
      .first();
    if (!session) {
      const id = await ctx.db.insert("sessions", {
        convexSessionId,
        account: account._id,
        data: { status: "active" },
      });
      const created = await ctx.db.get(id);
      if (!created) throw new Error("Failed to create session");
      return account._id;
    }
    if (session.account !== account._id) {
      await ctx.db.patch(session._id, { account: account._id });
    }
    return account._id;
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
