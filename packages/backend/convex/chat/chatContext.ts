import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server.js";
import { internalMutation, mutation, query } from "../_generated/server.js";

export type UpsertChatContextArgs = {
  namespace: string;
  threadId: string;
  lastMessageId?: string;
  sessionId: string;
};

export async function upsertChatContextRow(
  ctx: MutationCtx,
  args: UpsertChatContextArgs,
): Promise<void> {
  const existing = await ctx.db
    .query("chatContext")
    .withIndex("by_namespace_thread", (q) =>
      q.eq("namespace", args.namespace).eq("threadId", args.threadId),
    )
    .first();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      ...(args.lastMessageId !== undefined
        ? { lastMessageId: args.lastMessageId }
        : {}),
      sessionId: args.sessionId,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("chatContext", {
      namespace: args.namespace,
      threadId: args.threadId,
      ...(args.lastMessageId !== undefined
        ? { lastMessageId: args.lastMessageId }
        : {}),
      sessionId: args.sessionId,
      updatedAt: now,
    });
  }
}

export const getChatContext = query({
  args: {
    namespace: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatContext")
      .withIndex("by_namespace_thread", (q) =>
        q.eq("namespace", args.namespace).eq("threadId", args.threadId),
      )
      .first();
  },
});

export const upsertChatContext = mutation({
  args: {
    namespace: v.string(),
    threadId: v.string(),
    lastMessageId: v.optional(v.string()),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertChatContextRow(ctx, args);
    return null;
  },
});

/** Called from actions (e.g. after assistant stream) to advance the thread tip. */
export const internalUpsertChatContext = internalMutation({
  args: {
    namespace: v.string(),
    threadId: v.string(),
    lastMessageId: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertChatContextRow(ctx, args);
    return null;
  },
});
