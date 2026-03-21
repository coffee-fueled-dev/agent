import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { AgentMemoryClient } from "./components/agentMemory/client";
import { metadataRecordValidator } from "./components/agentMemory/internal/shared";
import {
  searchOptionsValidator,
  searchQueryValidator,
  type AgentMemorySearchResult,
} from "./components/agentMemory/public/search";
import {
  getThreadIdentityCurrent as getThreadIdentityCurrentImpl,
  listThreadIdentityEvolution as listThreadIdentityEvolutionImpl,
  recordThreadIdentityEpisode as recordThreadIdentityEpisodeImpl,
  searchThreadIdentityAsOf as searchThreadIdentityAsOfImpl,
  searchThreadIdentityCurrent as searchThreadIdentityCurrentImpl,
} from "./llms/identityMemory";

const sharedArgs = {
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  metadata: metadataRecordValidator,
  indexKind: v.optional(v.union(v.literal("current"), v.literal("historical"))),
  sourceKind: v.optional(v.string()),
  streamType: v.optional(v.string()),
  streamId: v.optional(v.string()),
  sourceEntryId: v.optional(v.string()),
  entity: v.optional(v.string()),
  entityType: v.optional(v.string()),
  sourceVersion: v.optional(v.number()),
  entryTime: v.optional(v.number()),
  validFrom: v.optional(v.number()),
  validTo: v.optional(v.union(v.number(), v.null())),
  scope: v.optional(v.string()),
};

export function createAgentMemoryClient() {
  return new AgentMemoryClient(components.agentMemory, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await createAgentMemoryClient().generateUploadUrl(ctx);
  },
});

export const addText = action({
  args: {
    ...sharedArgs,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().addText(ctx, args);
  },
});

export const addStoredTextFile = action({
  args: {
    ...sharedArgs,
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().addStoredTextFile(ctx, args);
  },
});

export const addStoredBinaryFile = action({
  args: {
    ...sharedArgs,
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().addStoredBinaryFile(ctx, args);
  },
});

export const search = action({
  args: {
    namespace: v.string(),
    query: searchQueryValidator,
    ...searchOptionsValidator,
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    return await createAgentMemoryClient().search(ctx, args);
  },
});

export const recordThreadIdentityEpisode = action({
  args: {
    threadId: v.string(),
    messageId: v.string(),
    codeId: v.string(),
    staticHash: v.string(),
    runtimeHash: v.string(),
    previousCodeId: v.optional(v.string()),
    previousStaticHash: v.optional(v.string()),
    previousRuntimeHash: v.optional(v.string()),
    entryTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await recordThreadIdentityEpisodeImpl(ctx, args);
  },
});

export const searchThreadIdentityCurrent = action({
  args: {
    threadId: v.string(),
    query: searchQueryValidator,
    ...searchOptionsValidator,
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    return await searchThreadIdentityCurrentImpl(ctx, args);
  },
});

export const searchThreadIdentityAsOf = action({
  args: {
    threadId: v.string(),
    query: searchQueryValidator,
    asOfTime: v.number(),
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
    includeHistorical: v.optional(v.boolean()),
    sourceKinds: v.optional(v.array(v.string())),
    entity: v.optional(v.string()),
    entityType: v.optional(v.string()),
    streamType: v.optional(v.string()),
    streamId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    return await searchThreadIdentityAsOfImpl(ctx, args);
  },
});

export const getThreadIdentityCurrent = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getThreadIdentityCurrentImpl(ctx, args);
  },
});

export const listThreadIdentityEvolution = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await listThreadIdentityEvolutionImpl(ctx, args);
  },
});
