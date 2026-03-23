import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { action, query } from "../_generated/server";
import { ContextClient } from "../components/context/client";

function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export const addContext = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.string(),
    metadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null()),
      ),
    ),
  },
  handler: async (ctx, args) => {
    return await createContextClient().add(ctx, args);
  },
});

export const listContext = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await createContextClient().list(ctx, args);
  },
});

export const listContextWithFiles = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await createContextClient().list(ctx, args);
    const enriched = await Promise.all(
      result.page.map(async (entry: (typeof result.page)[number]) => {
        const file = await ctx.db
          .query("contextFiles")
          .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
          .first();
        if (!file) return { ...entry, file: undefined };
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...entry,
          file: {
            storageId: file.storageId,
            mimeType: file.mimeType,
            fileName: file.fileName,
            url,
          },
        };
      }),
    );
    return { ...result, page: enriched };
  },
});

export const searchContext = action({
  args: {
    namespace: v.string(),
    query: v.union(v.string(), v.array(v.number())),
    limit: v.optional(v.number()),
    searchType: v.optional(
      v.union(v.literal("vector"), v.literal("text"), v.literal("hybrid")),
    ),
    vectorScoreThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await createContextClient().search(ctx, args);
  },
});
