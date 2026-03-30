import { v } from "convex/values";
import { z } from "zod/v4";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { sessionAction } from "../customFunctions";
import { accountActor } from "../eventAttribution";
import {
  EMBED_FOR_SEARCH_TEXT_MAX,
  embedText,
  isTextLikeMime,
} from "../lib/googleEmbedText";
import { publicStorageUrl } from "../lib/publicStorageUrl";
import { assertAccountNamespace } from "../models/auth/contextNamespace";
import {
  createContextClient,
  getConvexSiteUrl,
  getEmbeddingServerUrl,
  getFileEmbeddingSecret,
} from "./contextClient";

export type SearchContextSource =
  | {
      kind: "document";
      sourceType: "text" | "binary";
      document: string;
      documentId: string;
      entryId: string;
      key: string;
    }
  | {
      kind: "content";
      sourceType: "text" | "binary";
      contentId: string;
    };

export type SearchContextHit = {
  entryId: string;
  key: string;
  title?: string;
  text: string;
  importance: number;
  score: number;
  observationTime?: number;
  source?: SearchContextSource;
  textPreview?: string;
  /** Public HTTPS URL for file-backed binary entries (local dev may rewrite via ngrok). */
  filePublicUrl?: string;
  fileName?: string;
  mimeType?: string;
};

async function enrichSearchHitsWithPublicFiles(
  ctx: ActionCtx,
  namespace: string,
  hits: SearchContextHit[],
): Promise<SearchContextHit[]> {
  if (!hits.length) return hits;
  const files = await ctx.runQuery(
    internal.context.fileStore.getContextFilesForEntryIdsBatch,
    {
      namespace,
      entryIds: hits.map((h) => h.entryId),
    },
  );

  const out: SearchContextHit[] = [];
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (!hit) continue;
    const fr = files[i];
    if (
      fr &&
      hit.source?.kind === "document" &&
      hit.source.sourceType === "binary"
    ) {
      const rawUrl = await ctx.storage.getUrl(fr.storageId);
      if (rawUrl) {
        out.push({
          ...hit,
          filePublicUrl: publicStorageUrl(rawUrl),
          fileName: fr.fileName,
          mimeType: fr.mimeType,
        });
        continue;
      }
    }
    out.push(hit);
  }
  return out;
}

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
    fileEmbeddings: z.array(z.array(z.number())).optional(),
    minScore: z.number().optional(),
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
    assertAccountNamespace(accountId, args.namespace);
    const hits = await createContextClient().searchContext(ctx, {
      ...rest,
      actor: args.actor ?? (accountId ? accountActor(accountId) : undefined),
      session: args.session ?? sessionId,
      clientSessionId: args.clientSessionId ?? sessionId,
    });
    return await enrichSearchHitsWithPublicFiles(ctx, args.namespace, hits);
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
    fileEmbeddings: v.optional(v.array(v.array(v.number()))),
    minScore: v.optional(v.number()),
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
  handler: async (ctx, args): Promise<SearchContextHit[]> => {
    const hits = (await createContextClient().searchContext(
      ctx,
      args,
    )) as SearchContextHit[];
    return await enrichSearchHitsWithPublicFiles(ctx, args.namespace, hits);
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

    if (isTextLikeMime(args.mimeType)) {
      const trimmed = args.text?.trim();
      if (!trimmed) {
        throw new Error(
          "text is required for text/* embed-for-search (read the file in the client and pass `text`)",
        );
      }
      const snippet =
        trimmed.length > EMBED_FOR_SEARCH_TEXT_MAX
          ? trimmed.slice(0, EMBED_FOR_SEARCH_TEXT_MAX)
          : trimmed;
      const embedding = await embedText(snippet);
      await ctx.runMutation(
        internal.context.embeddingCacheStore.cacheEmbedding,
        {
          contentHash: args.contentHash,
          embedding,
          mimeType: args.mimeType,
        },
      );
      return;
    }

    const storageId = args.storageId as Id<"_storage">;
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
