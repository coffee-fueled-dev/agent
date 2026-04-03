import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { createEmbeddingModel } from "../_lib";

export const embedTextChunk = internalAction({
  args: {
    namespace: v.string(),
    memoryRecordId: v.id("memoryRecords"),
    sliceSeq: v.number(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await createEmbeddingModel().doEmbed({
      values: [args.text],
    });

    for (const embedding of result.embeddings) {
      await ctx.runMutation(internal.internal.store.applyEmbeddedChunk, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        sliceSeq: args.sliceSeq,
        text: args.text,
        embedding,
      });
    }
    return null;
  },
});
