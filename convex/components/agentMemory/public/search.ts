import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { createAgentMemoryRag } from "../internal/rag";
import type {
  AgentMemoryGoogleConfig,
  AgentMemorySourceType,
} from "../internal/shared";

export type AgentMemorySearchResult =
  | ({
      type: "text";
      text: string;
    } & SearchResultBase)
  | ({
      type: "textFile";
      text: string;
      url: string;
      storageId: Id<"_storage">;
      mimeType: string;
      fileName?: string | null;
    } & SearchResultBase)
  | ({
      type: "binaryFile";
      url: string;
      storageId: Id<"_storage">;
      mimeType: string;
      fileName?: string | null;
    } & SearchResultBase);

type SearchResultBase = {
  entryId: string;
  key: string;
  title?: string;
  importance: number;
  score: number;
};

type SearchableMetadata = {
  sourceType?: AgentMemorySourceType;
  storageId?: string;
  mimeType?: string;
  fileName?: string | null;
};

export type SearchArgs = AgentMemoryGoogleConfig & {
  namespace: string;
  query: string | number[];
  limit?: number;
  filters?: unknown[];
  chunkContext?: {
    before: number;
    after: number;
  };
  vectorScoreThreshold?: number;
  searchType?: "vector" | "text" | "hybrid";
  textWeight?: number;
  vectorWeight?: number;
};

export const searchQueryValidator = v.union(v.string(), v.array(v.number()));

export const searchOptionsValidator = {
  filters: v.optional(v.array(v.any())),
  limit: v.optional(v.number()),
  chunkContext: v.optional(
    v.object({
      before: v.number(),
      after: v.number(),
    }),
  ),
  vectorScoreThreshold: v.optional(v.number()),
  searchType: v.optional(
    v.union(v.literal("vector"), v.literal("text"), v.literal("hybrid")),
  ),
  textWeight: v.optional(v.number()),
  vectorWeight: v.optional(v.number()),
};

function readMetadata(
  metadata: Record<string, unknown> | undefined,
): SearchableMetadata {
  return {
    sourceType:
      metadata?.sourceType === "text" ||
      metadata?.sourceType === "textFile" ||
      metadata?.sourceType === "binaryFile"
        ? metadata.sourceType
        : undefined,
    storageId:
      typeof metadata?.storageId === "string" ? metadata.storageId : undefined,
    mimeType:
      typeof metadata?.mimeType === "string" ? metadata.mimeType : undefined,
    fileName:
      typeof metadata?.fileName === "string" || metadata?.fileName === null
        ? metadata.fileName
        : undefined,
  };
}

function entryKey(entry: { entryId: string; key?: string }) {
  return entry.key ?? entry.entryId;
}

function entryScore(
  searchResults: Array<{
    entryId: string;
    score: number;
  }>,
  entryId: string,
) {
  const score = searchResults
    .filter((result) => result.entryId === entryId)
    .reduce((max, result) => Math.max(max, result.score), Number.NEGATIVE_INFINITY);
  return Number.isFinite(score) ? score : 0;
}

export const search = action({
  args: {
    namespace: v.string(),
    query: searchQueryValidator,
    ...searchOptionsValidator,
    googleApiKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args: SearchArgs,
  ): Promise<AgentMemorySearchResult[]> => {
    const { entries, results: searchResults } = await createAgentMemoryRag({
      googleApiKey: args.googleApiKey,
    }).search(ctx, {
      namespace: args.namespace,
      query: args.query,
      filters: args.filters as never,
      limit: args.limit,
      chunkContext: args.chunkContext,
      vectorScoreThreshold: args.vectorScoreThreshold,
      searchType: args.searchType,
      textWeight: args.textWeight,
      vectorWeight: args.vectorWeight,
    });

    const results = await Promise.all(
      entries.map(async (entry): Promise<AgentMemorySearchResult | null> => {
        const metadata = readMetadata(entry.metadata);
        const base = {
          entryId: entry.entryId,
          key: entryKey(entry),
          title: entry.title,
          importance: entry.importance,
          score: entryScore(searchResults, entry.entryId),
        };
        if (metadata.sourceType === "textFile") {
          if (!metadata.storageId || !metadata.mimeType) {
            return null;
          }
          const url = await ctx.storage.getUrl(
            metadata.storageId as Id<"_storage">,
          );
          if (!url) {
            return null;
          }
          return {
            ...base,
            type: "textFile",
            text: entry.text,
            url,
            storageId: metadata.storageId as Id<"_storage">,
            mimeType: metadata.mimeType,
            fileName: metadata.fileName,
          };
        }
        if (metadata.sourceType === "binaryFile") {
          if (!metadata.storageId || !metadata.mimeType) {
            return null;
          }
          const url = await ctx.storage.getUrl(
            metadata.storageId as Id<"_storage">,
          );
          if (!url) {
            return null;
          }
          return {
            ...base,
            type: "binaryFile",
            url,
            storageId: metadata.storageId as Id<"_storage">,
            mimeType: metadata.mimeType,
            fileName: metadata.fileName,
          };
        }
        return {
          ...base,
          type: "text",
          text: entry.text,
        };
      }),
    );

    return results.filter((result) => result !== null);
  },
});
