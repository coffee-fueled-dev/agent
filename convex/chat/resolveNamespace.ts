import { components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

/**
 * Single place for context namespace scoping for chat.
 * Change this function to alter how namespaces are derived (org, team, etc.).
 * The model never receives namespace as a tool argument.
 */
export async function resolveThreadContext(
  ctx: ActionCtx,
  threadId: string,
): Promise<{ namespace: string; userId: string }> {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });
  if (!thread?.userId) {
    throw new Error(`Thread ${threadId} has no owner userId`);
  }
  return {
    namespace: `account:${thread.userId}`,
    userId: thread.userId,
  };
}
