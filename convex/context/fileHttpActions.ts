import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { createContextClient } from "./contextClient";

const chunkValidator = v.object({
  text: v.string(),
  embedding: v.array(v.number()),
});

export const completeFileProcess = internalAction({
  args: {
    processId: v.id("contextFileProcesses"),
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    retrievalText: v.string(),
    lexicalText: v.optional(v.string()),
    chunks: v.array(chunkValidator),
  },
  handler: async (ctx, args) => {
    const client = createContextClient();
    const result = await client.addContext(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      text: args.retrievalText,
      chunks: args.chunks,
      sourceType: "binary",
      searchText: args.lexicalText ?? args.retrievalText,
    });

    await ctx.runMutation(internal.context.fileStore.insertContextFile, {
      entryId: result.entryId,
      namespace: args.namespace,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
    });

    await ctx.runMutation(internal.context.fileStore.markCompleted, {
      processId: args.processId,
      entryId: result.entryId,
    });

    return { entryId: result.entryId, status: "completed" };
  },
});
