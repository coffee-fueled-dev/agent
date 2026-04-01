import { v } from "convex/values";
import { memoryClient } from "../../../../_clients/memory.js";
import { internalAction } from "../../../../_generated/server.js";

export const execute = internalAction({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  returns: v.object({
    deleted: v.literal(true),
    entryId: v.string(),
  }),
  handler: async (ctx, args) => {
    await memoryClient.removeMemory(ctx, {
      namespace: args.namespace,
      memoryId: args.entryId,
    });
    return { deleted: true as const, entryId: args.entryId };
  },
});
