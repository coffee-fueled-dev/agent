import { components, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

/**
 * Single place for context namespace scoping for chat.
 * Change this function to alter how namespaces are derived (org, team, etc.).
 * The model never receives namespace as a tool argument.
 *
 * When **token** is passed (same as `createThread`), resolves the account via `ensureTokenAccount` and
 * aligns `sessions.account` with that user — session **actions** never run `sessionMutation`, so the
 * session row is often missing or still points at a session-scoped account from a prior mutation.
 * Without a token, uses `sessions.account` from an earlier `createThread` / mutation.
 *
 * If the agent thread row is missing `userId`, it is patched so the component stays consistent.
 */
export async function resolveThreadContext(
  ctx: ActionCtx,
  threadId: string,
  convexSessionId: string,
  options?: { token?: string },
): Promise<{ namespace: string; userId: string }> {
  const accountId =
    options?.token != null && options.token !== ""
      ? await ctx.runMutation(
          internal.sessionResolve.ensureSessionAccountFromToken,
          { convexSessionId, token: options.token },
        )
      : await ctx.runQuery(
          internal.sessionResolve.getAccountIdForConvexSession,
          { convexSessionId },
        );

  if (!accountId) {
    throw new Error(
      "No account for this session. Pass token (same as createThread) or call createThread first.",
    );
  }

  const userId = accountId as string;

  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });
  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  if (thread.userId) {
    if (thread.userId !== userId) {
      throw new Error("Not authorized for this thread");
    }
  } else {
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { userId },
    });
  }

  return {
    namespace: `account:${userId}`,
    userId,
  };
}
