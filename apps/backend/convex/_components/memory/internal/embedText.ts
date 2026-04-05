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
    skipCanonicalText: v.optional(v.boolean()),
    contentSource: v.object({
      type: v.string(),
      id: v.string(),
    }),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    /** Passed from host mergeMemory; component env may not include the key. */
    googleApiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await createEmbeddingModel(args.googleApiKey).doEmbed({
      values: [args.text],
    });

    for (const embedding of result.embeddings) {
      await ctx.runMutation(internal.internal.store.applyEmbeddedChunk, {
        namespace: args.namespace,
        memoryRecordId: args.memoryRecordId,
        sliceSeq: args.sliceSeq,
        text: args.text,
        embedding,
        skipCanonicalText: args.skipCanonicalText,
        contentSource: args.contentSource,
        fileName: args.fileName,
        mimeType: args.mimeType,
      });
    }
    return null;
  },
});
