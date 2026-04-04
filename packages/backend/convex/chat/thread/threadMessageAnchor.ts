import { listMessages } from "@convex-dev/agent";
import { api, components } from "../../_generated/api.js";
import type { ActionCtx, QueryCtx } from "../../_generated/server.js";

type AnchorArgs = {
  namespace: string;
  threadId: string;
  messageIdOverride?: string | null;
};

/**
 * Resolves the message id used to anchor toolkit policy and actor history:
 * (1) non-empty `messageIdOverride` after trim, else (2) `chatContext.lastMessageId`, else
 * (3) latest message in the thread (`listMessages` with `numItems: 1`).
 *
 * Callers must pass a trimmed `threadId` and should skip calling when no thread is in scope.
 */
async function resolveEffectiveThreadMessageId(
  args: AnchorArgs,
  getChatContextLastMessageId: () => Promise<string | undefined | null>,
  getTranscriptTipMessageId: () => Promise<string | undefined>,
): Promise<string | undefined> {
  const override = args.messageIdOverride?.trim();
  if (override?.length) {
    return override;
  }
  let messageId = (await getChatContextLastMessageId()) ?? undefined;
  if (!messageId?.length) {
    messageId = await getTranscriptTipMessageId();
  }
  return messageId?.length ? messageId : undefined;
}

/**
 * Uses direct DB read for `chatContext` (queries use {@link QueryCtx}, not `runQuery` to self).
 */
export async function resolveEffectiveThreadMessageIdForQuery(
  ctx: QueryCtx,
  args: AnchorArgs,
): Promise<string | undefined> {
  return resolveEffectiveThreadMessageId(
    args,
    async () => {
      const row = await ctx.db
        .query("chatContext")
        .withIndex("by_namespace_thread", (q) =>
          q.eq("namespace", args.namespace).eq("threadId", args.threadId),
        )
        .first();
      return row?.lastMessageId;
    },
    async () => {
      const tipPage = await listMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: { cursor: null, numItems: 1 },
      });
      return tipPage.page[0]?._id;
    },
  );
}

/**
 * Uses {@link api.chat.chatContext.getChatContext} via {@link ActionCtx.runQuery}.
 */
export async function resolveEffectiveThreadMessageIdForAction(
  ctx: Pick<ActionCtx, "runQuery">,
  args: AnchorArgs,
): Promise<string | undefined> {
  return resolveEffectiveThreadMessageId(
    args,
    async () => {
      const row = await ctx.runQuery(api.chat.chatContext.getChatContext, {
        namespace: args.namespace,
        threadId: args.threadId,
      });
      return row?.lastMessageId;
    },
    async () => {
      const tipPage = await listMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: { cursor: null, numItems: 1 },
      });
      return tipPage.page[0]?._id;
    },
  );
}
