import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import { action, mutation, query } from "../_generated/server";
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
    observationTime: v.optional(v.number()),
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
    observationTime: v.optional(v.number()),
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
    includeHistorical: v.optional(v.boolean()),
    retrievalMode: v.optional(
      v.union(v.literal("vector"), v.literal("lexical"), v.literal("hybrid")),
    ),
    rrfK: v.optional(v.number()),
    vectorWeight: v.optional(v.number()),
    lexicalWeight: v.optional(v.number()),
    graphWeight: v.optional(v.number()),
    fileEmbedding: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    return await createContextClient().searchContext(ctx, args);
  },
});

function getEmbeddingServerUrl() {
  return process.env.EMBEDDING_SERVER_URL?.trim() || "http://127.0.0.1:3031";
}

function getFileEmbeddingSecret() {
  return (
    process.env.BINARY_EMBEDDING_SECRET?.trim() ||
    "dev-only-binary-embedding-secret"
  );
}

function getConvexSiteUrl() {
  const url =
    process.env.CONVEX_SITE_URL?.trim() || process.env.CONVEX_URL?.trim();
  if (!url) throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
  return url.replace(/\/+$/, "");
}

export const embedForSearch = action({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    contentHash: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.runQuery(
      api.context.embeddingCacheStore.getByHash,
      { contentHash: args.contentHash },
    );
    if (cached) return;

    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl)
      throw new Error(`Could not resolve URL for ${args.storageId}`);

    const baseUrl = getConvexSiteUrl();
    const response = await fetch(
      `${getEmbeddingServerUrl().replace(/\/+$/, "")}/embed`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-binary-embedding-secret": getFileEmbeddingSecret(),
        },
        body: JSON.stringify({
          processId: `search-${args.contentHash}`,
          fileUrl,
          mimeType: args.mimeType,
          text: args.text,
          contentHash: args.contentHash,
          cacheCompleteUrl: `${baseUrl}/embedding-cache/complete`,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Embedding server rejected the job (${response.status})`);
    }
  },
});

export const recordContextView = mutation({
  args: { namespace: v.string(), entryId: v.string() },
  handler: async (ctx, args) => {
    await createContextClient().recordView(ctx, args);
  },
});
