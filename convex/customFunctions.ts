import { type PaginationOptions, paginationOptsValidator } from "convex/server";
import {
  type RunSessionFunctions,
  runSessionFunctions,
  type SessionId,
  SessionIdArg,
} from "convex-helpers/server/sessions";
import type { Doc } from "./_generated/dataModel";
import {
  type ActionCtx,
  action,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import "./resolvers";
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
} from "convex-helpers/server/zod4";
import { ensureSessionAccount, resolveAccount } from "./lib/auth";
import { Session } from "./resolvers/auth";

export interface SessionQueryCtx extends QueryCtx {
  convexSessionId: SessionId;
  session: Doc<"sessions"> | null;
  account: Doc<"accounts"> | null;
}

export interface SessionMutationCtx extends MutationCtx {
  convexSessionId: SessionId;
  session: Doc<"sessions">;
  account: Doc<"accounts">;
}

export interface SessionActionCtx extends ActionCtx, RunSessionFunctions {}

async function resolveSession(ctx: QueryCtx, convexSessionId: SessionId) {
  const session = await Session.query(ctx)
    .withIndex("by_convexSessionId", (q) =>
      q.eq("convexSessionId", convexSessionId),
    )
    .first();
  const account = session?.account
    ? await resolveAccount(ctx, session.account)
    : null;
  return { session, account };
}

async function resolveOrCreateSession(
  ctx: MutationCtx,
  convexSessionId: SessionId,
) {
  const existing = await Session.query(ctx)
    .withIndex("by_convexSessionId", (q) =>
      q.eq("convexSessionId", convexSessionId),
    )
    .first();
  const session =
    existing ??
    (await (async () => {
      const id = await ctx.db.insert("sessions", {
        convexSessionId,
        account: null,
        data: { status: "active" },
      });
      const created = await ctx.db.get(id);
      if (!created) throw new Error("Failed to create session");
      return created;
    })());

  const account =
    session.account && (await resolveAccount(ctx, session.account));
  if (account) {
    return { session, account };
  }

  const linkedAccount = await ensureSessionAccount(ctx, convexSessionId);
  await ctx.db.patch(session._id, { account: linkedAccount._id });
  return {
    session: { ...session, account: linkedAccount._id },
    account: linkedAccount,
  };
}

export const sessionQuery = zCustomQuery(query, {
  args: SessionIdArg,
  input: async (
    ctx,
    { sessionId: convexSessionId },
  ): Promise<{ ctx: SessionQueryCtx; args: Record<string, never> }> => {
    const { session, account } = await resolveSession(ctx, convexSessionId);
    return { ctx: { ...ctx, session, account, convexSessionId }, args: {} };
  },
});

export const sessionPaginatedQuery = zCustomQuery(query, {
  args: {
    ...SessionIdArg,
    paginationOpts: paginationOptsValidator,
  },
  input: async (
    ctx,
    { sessionId: convexSessionId, paginationOpts },
  ): Promise<{
    ctx: SessionQueryCtx;
    args: { paginationOpts: PaginationOptions };
  }> => {
    const { session, account } = await resolveSession(ctx, convexSessionId);
    return {
      ctx: { ...ctx, session, account, convexSessionId },
      args: {
        paginationOpts: paginationOpts ?? { numItems: 10, cursor: null },
      },
    };
  },
});

export const sessionMutation = zCustomMutation(mutation, {
  args: SessionIdArg,
  input: async (
    ctx,
    { sessionId: convexSessionId },
  ): Promise<{ ctx: SessionMutationCtx; args: Record<string, never> }> => {
    const { session, account } = await resolveOrCreateSession(
      ctx,
      convexSessionId,
    );
    return { ctx: { ...ctx, session, account, convexSessionId }, args: {} };
  },
});

export const sessionAction = zCustomAction(action, {
  args: SessionIdArg,
  input: async (
    ctx,
    { sessionId },
  ): Promise<{ ctx: SessionActionCtx; args: { sessionId: SessionId } }> => ({
    ctx: {
      ...ctx,
      ...runSessionFunctions(ctx, sessionId),
    },
    args: { sessionId },
  }),
});
