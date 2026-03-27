import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, mutation } from "../_generated/server";
import { createContextClient } from "./contextClient";

export const addContext = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    observationTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await createContextClient().addContext(ctx, args);
  },
});

export const deleteContext = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    await createContextClient().deleteContext(ctx, args);
    await ctx.runMutation(internal.context.fileStore.deleteContextFile, {
      entryId: args.entryId,
    });
  },
});

export const editContext = action({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    observationTime: v.optional(v.number()),
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

export const recordContextView = mutation({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    actor: v.optional(
      v.object({
        byType: v.string(),
        byId: v.string(),
      }),
    ),
    session: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await createContextClient().recordView(ctx, args);
  },
});
