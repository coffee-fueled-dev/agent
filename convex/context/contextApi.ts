import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { action, query } from "../_generated/server";
import { ContextClient } from "../components/context/client";
import { embedText } from "./embedding";

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
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const embedding = await embedText(args.text, apiKey);
    const result = await createContextClient().add(ctx, {
      ...args,
      chunks: [{ text: args.text, embedding }],
    });
    await ctx.runMutation(internal.context.embedding.insertEmbedding, {
      entryId: result.entryId,
      namespace: args.namespace,
      embedding,
    });
    await ctx.runMutation(internal.context.embedding.markProjectionsStale, {
      namespace: args.namespace,
    });
    return result;
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
    type ContextEntry = Awaited<ReturnType<ContextClient["list"]>>["page"][number];
    let cursor: string | null = null;
    let entry: ContextEntry | null = null;

    for (let i = 0; i < 20; i++) {
      const page = await createContextClient().list(ctx, {
        namespace: args.namespace,
        paginationOpts: {
          cursor,
          numItems: 100,
        },
      });
      entry =
        page.page.find((item: ContextEntry) => item.entryId === args.entryId) ??
        null;
      if (entry || page.isDone) break;
      cursor = page.continueCursor;
    }

    if (!entry) return null;

    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
      .first();
    const url = file ? await ctx.storage.getUrl(file.storageId) : null;

    return {
      ...entry,
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
