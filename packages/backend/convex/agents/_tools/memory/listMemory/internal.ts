import { v } from "convex/values";
import { memoryClient } from "../../../../_clients/memory.js";
import { internalAction } from "../../../../_generated/server.js";

const paginationResultValidator = v.object({
  page: v.array(
    v.object({
      memoryId: v.string(),
      key: v.string(),
      title: v.optional(v.string()),
      textPreview: v.string(),
      updatedAt: v.number(),
    }),
  ),
  isDone: v.boolean(),
  continueCursor: v.string(),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
  splitCursor: v.optional(v.union(v.string(), v.null())),
});

export const execute = internalAction({
  args: {
    namespace: v.string(),
    cursor: v.optional(v.string()),
  },
  returns: paginationResultValidator,
  handler: async (ctx, args) => {
    return await memoryClient.listMemoryPage(ctx, {
      namespace: args.namespace,
      paginationOpts: {
        cursor: args.cursor ?? null,
        numItems: 20,
      },
    });
  },
});
