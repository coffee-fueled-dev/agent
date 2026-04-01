import { v } from "convex/values";
import { memoryClient } from "../../../../_clients/memory.js";
import { internalAction } from "../../../../_generated/server.js";

export const execute = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    text: v.optional(v.string()),
    title: v.optional(v.string()),
    observationTime: v.optional(v.number()),
  },
  returns: v.object({
    memoryId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    textPreview: v.string(),
    updatedAt: v.number(),
    observationTime: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const existing = await memoryClient.getMemory(ctx, {
      namespace: args.namespace,
      memoryId: args.entryId,
    });
    if (!existing) {
      throw new Error(`editMemory: memory not found: ${args.entryId}`);
    }
    const nextText = args.text ?? existing.fullText;
    const nextTitle = args.title ?? existing.title;
    await memoryClient.upsertMemory(ctx, {
      namespace: args.namespace,
      key: existing.key,
      title: nextTitle,
      text: nextText,
      sourceRef: args.entryId,
    });
    const updated = await memoryClient.getMemory(ctx, {
      namespace: args.namespace,
      memoryId: args.entryId,
    });
    if (!updated) {
      throw new Error(`editMemory: failed to reload memory: ${args.entryId}`);
    }
    return {
      memoryId: updated.memoryId,
      key: updated.key,
      title: updated.title,
      textPreview: updated.textPreview,
      updatedAt: updated.updatedAt,
      observationTime: args.observationTime,
    };
  },
});
