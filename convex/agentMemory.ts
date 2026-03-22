import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  type ActionCtx,
  action,
  internalAction,
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { agentMemoryEpisodicPool } from "./agentMemoryWorkpool";
import {
  memoryChartMetricNamespace,
  memoryChartNamespaceMetric,
  memoryChartTelemetry,
} from "./aggregate";
import { AgentMemoryClient } from "./components/agentMemory/client";
import {
  embedTextVector,
  loadStoredFile,
} from "./components/agentMemory/internal/embed";
import {
  type MemoryChartMember,
  type MemoryChartMetrics,
  type MemoryChartRepartitionEvent,
  type MemoryChartSummary,
  type MemoryChartSupportEdge,
  runtimeEpisodeCommitValidator,
  runtimeRegistrationValidator,
  runtimeSearchArgsValidator,
} from "./components/agentMemory/internal/runtime";
import { metadataRecordValidator } from "./components/agentMemory/internal/shared";
import {
  type AgentMemorySearchResult,
  searchOptionsValidator,
  searchQueryValidator,
} from "./components/agentMemory/public/search";
import {
  enqueueThreadIdentityEpisode as enqueueThreadIdentityEpisodeImpl,
  getThreadIdentityCurrent as getThreadIdentityCurrentImpl,
  listThreadIdentityEvolution as listThreadIdentityEvolutionImpl,
  recordThreadIdentityEpisode as recordThreadIdentityEpisodeImpl,
  searchThreadIdentityAsOf as searchThreadIdentityAsOfImpl,
  searchThreadIdentityCurrent as searchThreadIdentityCurrentImpl,
} from "./llms/identityMemory";
import {
  buildPublicMemoryFileUrl,
  isProviderAccessibleUrl,
} from "./llms/memoryFiles";

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

const chartSidecarArgs = {
  namespace: v.string(),
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  summary: v.string(),
  chartText: v.string(),
  sourceType: v.union(
    v.literal("text"),
    v.literal("textFile"),
    v.literal("binaryFile"),
  ),
  sourceKind: v.optional(v.string()),
  storageId: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  fileName: v.optional(v.union(v.string(), v.null())),
  metadata: metadataRecordValidator,
  entryTime: v.number(),
};

const chartMaintenanceArgs = {
  namespace: v.string(),
  requestId: v.string(),
  requestedAt: v.number(),
};

function compactSummary(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shorten(value: string, max = 280) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

async function enqueueMemoryChartSidecar(
  ctx: ActionCtx,
  args: {
    namespace: string;
    entryId: string;
    key: string;
    title?: string;
    summary: string;
    chartText: string;
    sourceType: "text" | "textFile" | "binaryFile";
    sourceKind?: string;
    storageId?: string;
    mimeType?: string;
    fileName?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
    entryTime?: number;
  },
) {
  const chartText = compactSummary(args.chartText);
  if (!chartText) {
    return;
  }
  await ctx.runMutation(internal.agentMemory.enqueueMemoryChartUpdate, {
    namespace: args.namespace,
    entryId: args.entryId,
    key: args.key,
    title: args.title,
    summary: shorten(compactSummary(args.summary || chartText)),
    chartText: shorten(chartText, 4_000),
    sourceType: args.sourceType,
    sourceKind: args.sourceKind,
    storageId: args.storageId,
    mimeType: args.mimeType,
    fileName: args.fileName,
    metadata: args.metadata,
    entryTime: args.entryTime ?? Date.now(),
  });
}

async function resolveMemoryMemberFileUrl(
  ctx: Pick<QueryCtx, "storage">,
  member: MemoryChartMember,
) {
  if (!member.storageId) {
    return null;
  }
  const publicUrl = buildPublicMemoryFileUrl({
    storageId: member.storageId,
    fileName: member.fileName,
  });
  if (publicUrl) {
    return publicUrl;
  }
  const providerUrl = await ctx.storage.getUrl(member.storageId as never);
  return providerUrl && isProviderAccessibleUrl(providerUrl)
    ? providerUrl
    : null;
}

async function withMemoryMemberFileUrl(
  ctx: Pick<QueryCtx, "storage">,
  member: MemoryChartMember,
) {
  return {
    ...member,
    fileUrl: await resolveMemoryMemberFileUrl(ctx, member),
  };
}

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
      components.agentMemory.public.runtimeApi.getRuntimeRegistration,
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
      components.agentMemory.public.runtimeApi.getRuntimeRegistration,
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
      components.agentMemory.public.runtimeApi.startRuntimeCommit,
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
      components.agentMemory.public.runtimeApi.appendRuntimeHistory,
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
        components.agentMemory.public.runtimeApi.applyRuntimeFacts,
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
      components.agentMemory.public.runtimeApi.completeRuntimeCommit,
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

export const processMemoryChartUpdateWork = internalAction({
  args: chartSidecarArgs,
  handler: async (ctx, args) => {
    const embedding = await embedTextVector({
      text: args.chartText,
      googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    const result = await ctx.runMutation(
      components.agentMemory.public.runtimeApi.upsertMemoryChartAssignment,
      {
        namespace: args.namespace,
        entryId: args.entryId,
        key: args.key,
        title: args.title,
        summary: args.summary,
        sourceType: args.sourceType,
        sourceKind: args.sourceKind,
        storageId: args.storageId,
        mimeType: args.mimeType,
        fileName: args.fileName,
        metadata: args.metadata,
        entryTime: args.entryTime,
        embedding,
      },
    );

    if (result.createdChart) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "charts"),
        key: null,
        id: String(result.chartId),
      });
    }
    if (result.createdMember) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "members"),
        key: null,
        id: args.entryId,
      });
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartMetricNamespace(
          String(result.chartId),
          "members",
        ),
        key: null,
        id: `${result.chartId}:${args.entryId}`,
      });
    }
    if (result.boundary) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "boundaries"),
        key: null,
        id: `${result.chartId}:${args.entryId}`,
      });
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartMetricNamespace(
          String(result.chartId),
          "boundaries",
        ),
        key: null,
        id: `${result.chartId}:${args.entryId}`,
      });
    }
    if (result.ambiguous) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "ambiguities"),
        key: null,
        id: `${result.chartId}:${args.entryId}`,
      });
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartMetricNamespace(
          String(result.chartId),
          "ambiguities",
        ),
        key: null,
        id: `${result.chartId}:${args.entryId}`,
      });
    }

    await ctx.runMutation(internal.agentMemory.enqueueMemoryChartMaintenance, {
      namespace: args.namespace,
      requestedAt: args.entryTime,
      requestId: crypto.randomUUID(),
    });

    return result;
  },
});

export const enqueueMemoryChartUpdate = internalMutation({
  args: chartSidecarArgs,
  handler: async (ctx, args): Promise<string> => {
    return await agentMemoryEpisodicPool.enqueueAction(
      ctx,
      internal.agentMemory.processMemoryChartUpdateWork,
      args,
      { retry: false },
    );
  },
});

export const processMemoryChartMaintenanceWork = internalAction({
  args: chartMaintenanceArgs,
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(
      components.agentMemory.public.runtimeApi.maintainMemoryChartNamespace,
      {
        namespace: args.namespace,
        entryTime: args.requestedAt,
      },
    );
    await ctx.runMutation(
      components.agentMemory.public.runtimeApi.completeMemoryChartMaintenance,
      {
        namespace: args.namespace,
        entryTime: Date.now(),
      },
    );
    await memoryChartTelemetry.delete(ctx, {
      namespace: memoryChartNamespaceMetric(
        args.namespace,
        "pendingMaintenance",
      ),
      key: null,
      id: args.requestId,
    });
    if (result.accepted) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "repartitions"),
        key: null,
        id: args.requestId,
      });
      if (result.kind === "split") {
        await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
          namespace: memoryChartNamespaceMetric(args.namespace, "splits"),
          key: null,
          id: args.requestId,
        });
      }
      if (result.kind === "merge") {
        await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
          namespace: memoryChartNamespaceMetric(args.namespace, "merges"),
          key: null,
          id: args.requestId,
        });
      }
    }
    for (const chartId of result.createdChartIds ?? []) {
      await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "charts"),
        key: null,
        id: chartId,
      });
    }
    for (const chartId of result.deletedChartIds ?? []) {
      await memoryChartTelemetry.delete(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "charts"),
        key: null,
        id: chartId,
      });
    }
    return result;
  },
});

export const enqueueMemoryChartMaintenance = internalMutation({
  args: chartMaintenanceArgs,
  handler: async (
    ctx,
    args,
  ): Promise<{ workId: string; requestId: string }> => {
    await ctx.runMutation(
      components.agentMemory.public.runtimeApi.markMemoryChartMaintenanceQueued,
      {
        namespace: args.namespace,
        entryTime: args.requestedAt,
      },
    );
    await memoryChartTelemetry.insertIfDoesNotExist(ctx, {
      namespace: memoryChartNamespaceMetric(
        args.namespace,
        "pendingMaintenance",
      ),
      key: null,
      id: args.requestId,
    });
    const workId = await agentMemoryEpisodicPool.enqueueAction(
      ctx,
      internal.agentMemory.processMemoryChartMaintenanceWork,
      args,
      {
        retry: false,
        onComplete: internal.agentMemoryWorkpool.chartMaintenanceCompleted,
        context: {
          namespace: args.namespace,
          requestId: args.requestId,
        },
      },
    );
    return { workId, requestId: args.requestId };
  },
});

export const getMemoryChartMetrics = query({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<MemoryChartMetrics> => {
    const componentMetrics: MemoryChartMetrics = await ctx.runQuery(
      components.agentMemory.public.runtimeApi.getMemoryChartNamespaceMetrics,
      { namespace: args.namespace },
    );
    return {
      ...componentMetrics,
      chartCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "charts"),
      }),
      memberCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "members"),
      }),
      boundaryCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "boundaries"),
      }),
      ambiguityCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "ambiguities"),
      }),
      repartitionCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "repartitions"),
      }),
      splitCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "splits"),
      }),
      mergeCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(args.namespace, "merges"),
      }),
      pendingMaintenanceCount: await memoryChartTelemetry.count(ctx, {
        namespace: memoryChartNamespaceMetric(
          args.namespace,
          "pendingMaintenance",
        ),
      }),
    };
  },
});

export const listMemoryCharts = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    page: MemoryChartSummary[];
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  }> => {
    return await ctx.runQuery(
      components.agentMemory.public.runtimeApi.listMemoryCharts,
      args,
    );
  },
});

export const getMemoryChart = query({
  args: {
    chartId: v.string(),
  },
  handler: async (ctx, args): Promise<MemoryChartSummary | null> => {
    return await ctx.runQuery(
      components.agentMemory.public.runtimeApi.getMemoryChart,
      {
        chartId: args.chartId as never,
      },
    );
  },
});

export const listMemoryChartMembers = query({
  args: {
    chartId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    page: Array<MemoryChartMember & { fileUrl?: string | null }>;
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  }> => {
    const results = await ctx.runQuery(
      components.agentMemory.public.runtimeApi.listMemoryChartMembers,
      { chartId: args.chartId as never, paginationOpts: args.paginationOpts },
    );
    return {
      ...results,
      page: await Promise.all(
        results.page.map((member: MemoryChartMember) =>
          withMemoryMemberFileUrl(ctx, member),
        ),
      ),
    };
  },
});

export const getMemoryChartMemberByEntryId = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<(MemoryChartMember & { fileUrl?: string | null }) | null> => {
    const member = await ctx.runQuery(
      components.agentMemory.public.runtimeApi.getMemoryChartMemberByEntryId,
      args,
    );
    if (!member) {
      return null;
    }
    return await withMemoryMemberFileUrl(ctx, member);
  },
});

export const listMemoryChartSupportEdges = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    page: MemoryChartSupportEdge[];
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  }> => {
    return await ctx.runQuery(
      components.agentMemory.public.runtimeApi.listMemoryChartSupportEdges,
      args,
    );
  },
});

export const listMemoryChartRepartitionEvents = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    page: MemoryChartRepartitionEvent[];
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  }> => {
    return await ctx.runQuery(
      components.agentMemory.public.runtimeApi.listMemoryChartRepartitionEvents,
      args,
    );
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
    const result = await createAgentMemoryClient().addText(ctx, args);
    try {
      await enqueueMemoryChartSidecar(ctx, {
        namespace: args.namespace,
        entryId: result.entryId,
        key: args.key,
        title: args.title,
        summary: args.text,
        chartText: args.text,
        sourceType: "text",
        sourceKind: args.sourceKind,
        metadata: args.metadata,
        entryTime: args.entryTime,
      });
    } catch (error) {
      console.error("Failed to enqueue memory chart update", error);
    }
    return result;
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
    const result = await createAgentMemoryClient().addStoredTextFile(ctx, args);
    try {
      const file = await loadStoredFile(ctx, args.storageId);
      const text = new TextDecoder().decode(await file.arrayBuffer());
      await enqueueMemoryChartSidecar(ctx, {
        namespace: args.namespace,
        entryId: result.entryId,
        key: args.key,
        title: args.title,
        summary: text,
        chartText: text,
        sourceType: "textFile",
        sourceKind: args.sourceKind,
        storageId: String(args.storageId),
        mimeType: args.mimeType,
        fileName: args.fileName ?? null,
        metadata: args.metadata,
        entryTime: args.entryTime,
      });
    } catch (error) {
      console.error("Failed to enqueue memory chart update", error);
    }
    return result;
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

export const searchContextMemories = action({
  args: {
    namespace: v.string(),
    query: searchQueryValidator,
    chartIds: v.optional(v.array(v.string())),
    ...searchOptionsValidator,
  },
  handler: async (ctx, args): Promise<AgentMemorySearchResult[]> => {
    const { chartIds, ...searchArgs } = args;
    const results = await createAgentMemoryClient().search(ctx, searchArgs);
    if (!chartIds || chartIds.length === 0) {
      return results;
    }

    const entryIds = await ctx.runQuery(
      components.agentMemory.public.runtimeApi.getMemoryEntryIdsForCharts,
      {
        namespace: args.namespace,
        chartIds: chartIds,
      },
    );
    const selectedEntryIds = new Set(entryIds);
    return results.filter((result) => selectedEntryIds.has(result.entryId));
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
