import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, internalAction, mutation, query } from "./_generated/server";
import { AgentMemoryClient } from "./components/agentMemory/client";
import { metadataRecordValidator } from "./components/agentMemory/internal/shared";
import {
  runtimeEpisodeCommitValidator,
  runtimeRegistrationValidator,
  runtimeSearchArgsValidator,
} from "./components/agentMemory/internal/runtime";
import {
  searchOptionsValidator,
  searchQueryValidator,
  type AgentMemorySearchResult,
} from "./components/agentMemory/public/search";
import { agentMemoryEpisodicPool } from "./agentMemoryWorkpool";
import { internal } from "./_generated/api";
import {
  getThreadIdentityCurrent as getThreadIdentityCurrentImpl,
  enqueueThreadIdentityEpisode as enqueueThreadIdentityEpisodeImpl,
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

const runtimeSearchOptionArgs = {
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
  asOfTime: v.optional(v.number()),
  includeHistorical: v.optional(v.boolean()),
  sourceKinds: v.optional(v.array(v.string())),
  entity: v.optional(v.string()),
  entityType: v.optional(v.string()),
};

export function createAgentMemoryClient() {
  return new AgentMemoryClient(components.agentMemory, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export const registerRuntime = mutation({
  args: runtimeRegistrationValidator,
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().registerRuntime(ctx, args);
  },
});

export const getRuntimeStreamState = query({
  args: runtimeSearchArgsValidator,
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().getRuntimeStreamState(ctx, args);
  },
});

export const getRuntimeCurrent = query({
  args: runtimeSearchArgsValidator,
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().getRuntimeCurrent(ctx, args);
  },
});

export const listRuntimeEvolution = query({
  args: {
    ...runtimeSearchArgsValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await createAgentMemoryClient().listRuntimeEvolution(ctx, args);
  },
});

export const searchRuntimeCurrent = action({
  args: {
    ...runtimeSearchArgsValidator,
    query: searchQueryValidator,
    ...runtimeSearchOptionArgs,
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    const streamId = args.streamId as string;
    const registration = await ctx.runQuery(
      components.agentMemory.public.runtime.getRuntimeRegistration,
      { runtime: args.runtime },
    );
    const state = await createAgentMemoryClient().getRuntimeStreamState(ctx, {
      runtime: args.runtime,
      streamId,
    });
    return await createAgentMemoryClient().search(ctx, {
      ...args,
      namespace: state.currentNamespace,
      includeHistorical: false,
      sourceKinds:
        args.sourceKinds ?? registration.currentSourceKinds ?? undefined,
      streamType: registration.historyStreamType,
      streamId,
    });
  },
});

export const searchRuntimeHistorical = action({
  args: {
    ...runtimeSearchArgsValidator,
    query: searchQueryValidator,
    ...runtimeSearchOptionArgs,
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    const streamId = args.streamId as string;
    const registration = await ctx.runQuery(
      components.agentMemory.public.runtime.getRuntimeRegistration,
      { runtime: args.runtime },
    );
    const state = await createAgentMemoryClient().getRuntimeStreamState(ctx, {
      runtime: args.runtime,
      streamId,
    });
    return await createAgentMemoryClient().search(ctx, {
      ...args,
      namespace: state.historicalNamespace,
      includeHistorical: args.includeHistorical ?? true,
      sourceKinds:
        args.sourceKinds ?? registration.historicalSourceKinds ?? undefined,
      streamType: registration.historyStreamType,
      streamId,
    });
  },
});

export const commitRuntimeEpisodeWork = internalAction({
  args: runtimeEpisodeCommitValidator,
  handler: async (ctx, args) => {
    const started = await ctx.runMutation(
      components.agentMemory.public.runtime.startRuntimeCommit,
      {
        runtime: args.runtime,
        streamId: args.streamId,
        commitKey: args.commitKey,
        workId: args.workId,
        entryTime: args.entryTime,
        currentKey: args.current?.key,
        historicalKey: args.historical?.key,
      },
    );
    if (started.skipped) {
      return {
        commitKey: args.commitKey,
        sourceVersion: started.stream.latestVersion,
        entryId: started.stream.latestEntryId ?? null,
        skipped: true,
      };
    }

    const { registration, stream, sourceVersion, entryTime } = started;
    const historyEntry = await ctx.runMutation(
      components.agentMemory.public.runtime.appendRuntimeHistory,
      {
        runtime: args.runtime,
        streamId: args.streamId,
        entryId: args.history.entryId,
        kind: args.history.kind,
        entryTime,
        parentEntryIds: args.history.parentEntryIds,
        payload: args.history.payload,
      },
    );

    if (
      args.facts.items.length > 0 ||
      (args.facts.edges?.length ?? 0) > 0 ||
      (args.facts.partitions?.length ?? 0) > 0
    ) {
      await ctx.runMutation(
        components.agentMemory.public.runtime.applyRuntimeFacts,
        {
          runtime: args.runtime,
          streamId: args.streamId,
          sourceVersion,
          facts: args.facts,
        },
      );
    }

    if (args.current) {
      await ctx.runAction(components.agentMemory.public.add.addText, {
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        namespace: stream.currentNamespace,
        key: args.current.key,
        title: args.current.title,
        text: args.current.text,
        indexKind: "current",
        sourceKind: args.current.sourceKind ?? "fact",
        streamType: registration.historyStreamType,
        streamId: args.streamId,
        sourceEntryId: historyEntry.entryId,
        entity: args.current.entity,
        entityType: args.current.entityType,
        sourceVersion,
        entryTime,
        validFrom: args.current.validFrom ?? entryTime,
        validTo: args.current.validTo,
        scope: args.current.scope,
        metadata: args.current.metadata,
      });
    }

    if (args.historical) {
      await ctx.runAction(components.agentMemory.public.add.addText, {
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        namespace: stream.historicalNamespace,
        key: args.historical.key,
        title: args.historical.title,
        text: args.historical.text,
        indexKind: "historical",
        sourceKind: args.historical.sourceKind ?? "episode",
        streamType: registration.historyStreamType,
        streamId: args.streamId,
        sourceEntryId: historyEntry.entryId,
        entity: args.historical.entity,
        entityType: args.historical.entityType,
        sourceVersion,
        entryTime,
        validFrom: args.historical.validFrom ?? entryTime,
        validTo: args.historical.validTo,
        scope: args.historical.scope,
        metadata: args.historical.metadata,
      });
    }

    await ctx.runMutation(
      components.agentMemory.public.runtime.completeRuntimeCommit,
      {
        runtime: args.runtime,
        streamId: args.streamId,
        commitKey: args.commitKey,
        workId: args.workId,
        entryId: historyEntry.entryId,
        sourceVersion,
        entryTime,
        latestEntity:
          args.latestEntity ??
          args.facts.items.at(-1)?.entity ??
          stream.latestEntity,
        currentKey: args.current?.key,
        historicalKey: args.historical?.key,
      },
    );

    return {
      commitKey: args.commitKey,
      sourceVersion,
      entryId: historyEntry.entryId,
      skipped: false,
    };
  },
});

export const enqueueRuntimeEpisode = mutation({
  args: runtimeEpisodeCommitValidator,
  handler: async (ctx, args): Promise<{ workId: string }> => {
    const workId: string = await agentMemoryEpisodicPool.enqueueAction(
      ctx,
      internal.agentMemory.commitRuntimeEpisodeWork,
      args,
      {
        retry: false,
        onComplete: internal.agentMemoryWorkpool.episodicCommitCompleted,
        context: {
          runtime: args.runtime,
          streamId: args.streamId,
          commitKey: args.commitKey,
        },
      },
    );
    await createAgentMemoryClient().markRuntimeCommitQueued(ctx, {
      runtime: args.runtime,
      streamId: args.streamId,
      commitKey: args.commitKey,
      workId,
    });
    return { workId };
  },
});

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
  handler: async (ctx, args): Promise<{ workId: string }> => {
    return await recordThreadIdentityEpisodeImpl(ctx, args);
  },
});

export const enqueueThreadIdentityEpisode = mutation({
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
  handler: async (ctx, args): Promise<{ workId: string }> => {
    return await enqueueThreadIdentityEpisodeImpl(ctx, args);
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
