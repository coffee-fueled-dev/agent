import { v } from "convex/values";
import { z } from "zod/v4";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { sessionAction } from "../customFunctions";
import { accountActor } from "../eventAttribution";
import {
  createContextClient,
  getConvexSiteUrl,
  getEmbeddingServerUrl,
  getFileEmbeddingSecret,
} from "./contextClient";

type SearchContextHit = {
  entryId: string;
  key: string;
  title?: string;
  text: string;
  importance: number;
  score: number;
  observationTime?: number;
  metadata?: unknown;
};

export const searchContext = sessionAction({
  args: {
    namespace: z.string(),
    query: z.union([z.string(), z.array(z.number())]),
    limit: z.number().optional(),
    includeHistorical: z.boolean().optional(),
    retrievalMode: z.enum(["vector", "lexical", "hybrid"]).optional(),
    rrfK: z.number().optional(),
    vectorWeight: z.number().optional(),
    lexicalWeight: z.number().optional(),
    graphWeight: z.number().optional(),
    accessWeight: z.number().optional(),
    fileEmbedding: z.array(z.number()).optional(),
    actor: z
      .object({
        byType: z.string(),
        byId: z.string(),
      })
      .optional(),
    session: z.string().optional(),
    threadId: z.string().optional(),
    clientSessionId: z.string().optional(),
  },
  handler: async (ctx, args): Promise<SearchContextHit[]> => {
    const { sessionId, ...rest } = args;
    const accountId: Id<"accounts"> | null = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: sessionId },
    );
    return await createContextClient().searchContext(ctx, {
      ...rest,
      actor: args.actor ?? (accountId ? accountActor(accountId) : undefined),
      session: args.session ?? sessionId,
      clientSessionId: args.clientSessionId ?? sessionId,
    });
  },
});

/** Server-only (e.g. agent tools) — no browser session. */
export const searchContextInternal = internalAction({
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

export const embedForSearch = sessionAction({
  args: {
    storageId: z.string(),
    mimeType: z.string(),
    contentHash: z.string(),
    text: z.string().optional(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.runQuery(
      internal.context.embeddingCacheStore.getByHashInternal,
      { contentHash: args.contentHash },
    );
    if (cached) return;

    const storageId =
      args.storageId as import("../_generated/dataModel").Id<"_storage">;
    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) throw new Error(`Could not resolve URL for ${storageId}`);

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
