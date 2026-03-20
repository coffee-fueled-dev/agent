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
import { Session } from "./resolvers/auth";

export interface SessionQueryCtx extends QueryCtx {
  convexSessionId: SessionId;
  session: Doc<"sessions"> | null;
}

export interface SessionMutationCtx extends MutationCtx {
  convexSessionId: SessionId;
  session: Doc<"sessions">;
}

export interface SessionActionCtx extends ActionCtx, RunSessionFunctions {}

async function resolveSession(ctx: QueryCtx, convexSessionId: SessionId) {
  return Session.query(ctx)
    .withIndex("by_convexSessionId", (q) =>
      q.eq("convexSessionId", convexSessionId),
    )
    .first();
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
  if (existing) return existing;
  const id = await ctx.db.insert("sessions", {
    convexSessionId,
    data: { status: "active" },
  });
  const session = await ctx.db.get(id);
  if (!session) throw new Error("Failed to create session");
  return session;
}

export const sessionQuery = zCustomQuery(query, {
  args: SessionIdArg,
  input: async (
    ctx,
    { sessionId: convexSessionId },
  ): Promise<{ ctx: SessionQueryCtx; args: Record<string, never> }> => {
    const session = await resolveSession(ctx, convexSessionId);
    return { ctx: { ...ctx, session, convexSessionId }, args: {} };
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
    const session = await resolveSession(ctx, convexSessionId);
    return {
      ctx: { ...ctx, session, convexSessionId },
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
    const session = await resolveOrCreateSession(ctx, convexSessionId);
    return { ctx: { ...ctx, session, convexSessionId }, args: {} };
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
