import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, mutation } from "./_generated/server";
import { AgentMemoryClient } from "./components/agentMemory/client";
import { metadataRecordValidator } from "./components/agentMemory/internal/shared";
import {
  searchOptionsValidator,
  searchQueryValidator,
  type AgentMemorySearchResult,
} from "./components/agentMemory/public/search";

const sharedArgs = {
  namespace: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  metadata: metadataRecordValidator,
};

function createAgentMemoryClient() {
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
