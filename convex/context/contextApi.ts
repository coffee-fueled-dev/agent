import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
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
  },
  handler: async (ctx, args) => {
    return await createContextClient().addContext(ctx, args);
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
      result.page.map(async (entry) => {
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

export const getContextFile = query({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (!file) return null;
    const url = await ctx.storage.getUrl(file.storageId);
    return { mimeType: file.mimeType, fileName: file.fileName, url };
  },
});

export const getContextDetail = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const detail = await createContextClient().getContextDetail(ctx, args);
    if (!detail) return null;

    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", detail.entryId))
      .first();
    const url = file ? await ctx.storage.getUrl(file.storageId) : null;

    return {
      ...detail,
      file: file
        ? {
            storageId: file.storageId,
            mimeType: file.mimeType,
            fileName: file.fileName,
            url,
          }
        : null,
    };
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

export const searchContext = action({
  args: {
    namespace: v.string(),
    query: v.union(v.string(), v.array(v.number())),
    limit: v.optional(v.number()),
    searchType: v.optional(
      v.union(v.literal("vector"), v.literal("text"), v.literal("hybrid")),
    ),
    vectorScoreThreshold: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    rrfK: v.optional(v.number()),
    vectorWeight: v.optional(v.number()),
    lexicalWeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await createContextClient().searchContext(ctx, args);
  },
});
