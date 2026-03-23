import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { ContextClient } from "../components/context/client";

function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

const chunkValidator = v.object({
  text: v.string(),
  embedding: v.array(v.number()),
});

export const completeFileProcess = internalAction({
  args: {
    processId: v.string(),
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    retrievalText: v.string(),
    chunks: v.array(chunkValidator),
  },
  handler: async (ctx, args) => {
    const result = await createContextClient().add(ctx, {
      namespace: args.namespace,
      key: args.key,
      title: args.title,
      text: args.retrievalText,
      chunks: args.chunks,
    });

    await ctx.runMutation(internal.context.fileStore.insertContextFile, {
      entryId: result.entryId,
      namespace: args.namespace,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
    });

    await ctx.runMutation(internal.context.fileStore.markCompleted, {
      processId: args.processId as never,
      entryId: result.entryId,
    });

    return { entryId: result.entryId, status: "completed" };
  },
});
