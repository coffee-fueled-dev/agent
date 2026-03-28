import { v } from "convex/values";
import { api } from "../_generated/api";
import { action } from "../_generated/server";
import {
  createContextClient,
  getConvexSiteUrl,
  getEmbeddingServerUrl,
  getFileEmbeddingSecret,
} from "./contextClient";

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
    accessWeight: v.optional(v.number()),
    fileEmbedding: v.optional(v.array(v.number())),
    actor: v.optional(
      v.object({
        byType: v.string(),
        byId: v.string(),
      }),
    ),
    session: v.optional(v.string()),
    threadId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createContextClient().searchContext(ctx, args);
  },
});

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
