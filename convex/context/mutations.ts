import { v } from "convex/values";
import { z } from "zod/v4";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { sessionAction, sessionMutation } from "../customFunctions";
import { accountActor } from "../eventAttribution";
import { assertAccountNamespace } from "../models/auth/contextNamespace";
import { createContextClient } from "./contextClient";

export const addContext = sessionAction({
  args: {
    namespace: z.string(),
    key: z.string(),
    title: z.string().optional(),
    text: z.string(),
    observationTime: z.number().optional(),
    threadId: z.string().optional(),
  },
  handler: async (ctx, args): Promise<{ entryId: string }> => {
    const { sessionId, ...rest } = args;
    const accountId: Id<"accounts"> | null = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: sessionId },
    );
    assertAccountNamespace(accountId, args.namespace);
    return await createContextClient().addContext(ctx, {
      ...rest,
      actor: accountId ? accountActor(accountId) : undefined,
      session: sessionId,
      threadId: args.threadId,
    });
  },
});

/** Server-only (e.g. agent tools) — no browser session. */
export const addContextInternal = internalAction({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    observationTime: v.optional(v.number()),
    actor: v.optional(v.object({ byType: v.string(), byId: v.string() })),
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createContextClient().addContext(ctx, args);
  },
});

export const deleteContext = sessionAction({
  args: {
    namespace: z.string(),
    entryId: z.string(),
    threadId: z.string().optional(),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, ...rest } = args;
    const accountId: Id<"accounts"> | null = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: sessionId },
    );
    assertAccountNamespace(accountId, args.namespace);
    await createContextClient().deleteContext(ctx, {
      ...rest,
      actor: accountId ? accountActor(accountId) : undefined,
      session: sessionId,
      threadId: args.threadId,
    });
    await ctx.runMutation(internal.context.fileStore.deleteContextFile, {
      entryId: args.entryId,
    });
  },
});

export const deleteContextInternal = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    actor: v.optional(v.object({ byType: v.string(), byId: v.string() })),
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await createContextClient().deleteContext(ctx, args);
    await ctx.runMutation(internal.context.fileStore.deleteContextFile, {
      entryId: args.entryId,
    });
  },
});

export const editContext = sessionAction({
  args: {
    namespace: z.string(),
    entryId: z.string(),
    title: z.string().optional(),
    text: z.string(),
    observationTime: z.number().optional(),
    threadId: z.string().optional(),
  },
  handler: async (ctx, args): Promise<{ entryId: string }> => {
    const { sessionId, ...rest } = args;
    const accountId: Id<"accounts"> | null = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: sessionId },
    );
    assertAccountNamespace(accountId, args.namespace);
    const result = await createContextClient().editContext(ctx, {
      ...rest,
      actor: accountId ? accountActor(accountId) : undefined,
      session: sessionId,
      threadId: args.threadId,
    });
    await ctx.runMutation(internal.context.fileStore.updateContextFileEntryId, {
      oldEntryId: args.entryId,
      newEntryId: result.entryId,
    });
    return result;
  },
});

export const editContextInternal = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    observationTime: v.optional(v.number()),
    actor: v.optional(v.object({ byType: v.string(), byId: v.string() })),
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await createContextClient().editContext(ctx, args);
    await ctx.runMutation(internal.context.fileStore.updateContextFileEntryId, {
      oldEntryId: args.entryId,
      newEntryId: result.entryId,
    });
    return result;
  },
});

export const recordContextView = sessionMutation({
  args: {
    namespace: z.string(),
    entryId: z.string(),
    actor: z
      .object({
        byType: z.string(),
        byId: z.string(),
      })
      .optional(),
    session: z.string().optional(),
    idempotencyKey: z.string().optional(),
  },
  handler: async (ctx, args) => {
    assertAccountNamespace(ctx.account._id, args.namespace);
    await createContextClient().recordView(ctx, {
      ...args,
      session: args.session ?? ctx.convexSessionId,
      actor: args.actor ?? accountActor(ctx.account._id),
    });
  },
});
