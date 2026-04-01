import { v } from "convex/values";
import { memoryClient } from "../../../../_clients/memory.js";
import { internalAction } from "../../../../_generated/server.js";

export const execute = internalAction({
  args: {
    namespace: v.string(),
    text: v.string(),
    title: v.optional(v.string()),
    observationTime: v.optional(v.number()),
  },
  returns: v.object({
    memoryId: v.string(),
    key: v.string(),
    observationTime: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const key = `memory-${crypto.randomUUID()}`;
    const result = await memoryClient.upsertMemory(ctx, {
      namespace: args.namespace,
      key,
      title: args.title,
      text: args.text,
    });
    return {
      memoryId: result.memoryId,
      key,
      observationTime: args.observationTime,
    };
  },
});
