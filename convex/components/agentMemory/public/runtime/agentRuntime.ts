import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../../_generated/api";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import {
  runtimeRegistrationValidator,
  runtimeSearchArgsValidator,
  type RuntimeCurrentView,
  type RuntimeEvolutionView,
  type RuntimeRegistrationArgs,
  type RuntimeStreamState,
} from "../../internal/runtime";
import { latestFactFromRows, type RuntimeHistoryEntrySummary } from "./shared";
import {
  getRuntimeCommitRow,
  getRuntimeRegistrationRow,
  getRuntimeStreamRow,
  runtimeNamespace,
  toRuntimeStreamState,
  upsertCommitState,
} from "./state";

export const getRuntimeRegistrationArgs = { runtime: v.string() };
export const startRuntimeCommitArgs = {
  runtime: v.string(),
  streamId: v.string(),
  commitKey: v.string(),
  workId: v.optional(v.string()),
  entryTime: v.optional(v.number()),
  currentKey: v.optional(v.string()),
  historicalKey: v.optional(v.string()),
};
export const appendRuntimeHistoryArgs = {
  runtime: v.string(),
  streamId: v.string(),
  entryId: v.string(),
  kind: v.string(),
  entryTime: v.number(),
  parentEntryIds: v.optional(v.array(v.string())),
  payload: v.optional(v.any()),
};
export const applyRuntimeFactsArgs = {
  runtime: v.string(),
  streamId: v.string(),
  sourceVersion: v.number(),
  facts: v.object({
    items: v.array(
      v.object({
        entity: v.string(),
        entityType: v.string(),
        scope: v.optional(v.string()),
        state: v.optional(v.string()),
        order: v.array(v.number()),
        labels: v.optional(v.array(v.string())),
        attrs: v.optional(
          v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
        ),
      }),
    ),
    edges: v.optional(
      v.array(
        v.object({
          kind: v.string(),
          from: v.string(),
          to: v.string(),
          scope: v.optional(v.string()),
        }),
      ),
    ),
    partitions: v.optional(
      v.array(
        v.object({
          partition: v.string(),
          scope: v.optional(v.string()),
          head: v.optional(v.string()),
          tail: v.optional(v.string()),
          count: v.number(),
          membersVersion: v.optional(v.number()),
        }),
      ),
    ),
    projector: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("direct"), v.literal("event"))),
  }),
};
export const completeRuntimeCommitArgs = {
  runtime: v.string(),
  streamId: v.string(),
  commitKey: v.string(),
  workId: v.optional(v.string()),
  entryId: v.string(),
  sourceVersion: v.number(),
  entryTime: v.number(),
  latestEntity: v.optional(v.string()),
  currentKey: v.optional(v.string()),
  historicalKey: v.optional(v.string()),
};
export const markRuntimeCommitQueuedArgs = {
  runtime: v.string(),
  streamId: v.string(),
  commitKey: v.string(),
  workId: v.string(),
};
export const finalizeRuntimeCommitArgs = {
  workId: v.string(),
  state: v.union(v.literal("failed"), v.literal("canceled")),
  error: v.optional(v.string()),
};

export async function registerRuntimeImpl(
  ctx: MutationCtx,
  args: RuntimeRegistrationArgs,
) {
  const existing = await ctx.db
    .query("runtimeRegistrations")
    .withIndex("by_runtime", (q) => q.eq("runtime", args.runtime))
    .unique();
  const now = Date.now();
  const patch = {
    runtime: args.runtime,
    description: args.description,
    historyStreamType: args.historyStreamType,
    factEntities: args.facts.entities,
    factEdgeKinds: args.facts.edgeKinds,
    factPartitions: args.facts.partitions,
    factsNamespaceSuffix: args.namespaces?.facts ?? "facts",
    currentNamespaceSuffix: args.namespaces?.current ?? "current",
    historicalNamespaceSuffix: args.namespaces?.historical ?? "history",
    currentSourceKinds: args.searchProfiles?.current?.sourceKinds,
    historicalSourceKinds: args.searchProfiles?.historical?.sourceKinds,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return await ctx.db.get(existing._id);
  }
  const id = await ctx.db.insert("runtimeRegistrations", {
    ...patch,
    createdAt: now,
  });
  return await ctx.db.get(id);
}

export async function getRuntimeRegistrationImpl(
  ctx: QueryCtx,
  args: { runtime: string },
) {
  return await getRuntimeRegistrationRow(ctx, args.runtime);
}

export async function getRuntimeStreamStateImpl(
  ctx: QueryCtx,
  args: { runtime: string; streamId: string },
): Promise<RuntimeStreamState> {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  return toRuntimeStreamState(registration, args.streamId, stream);
}

export async function markRuntimeCommitQueuedImpl(
  ctx: MutationCtx,
  args: {
    runtime: string;
    streamId: string;
    commitKey: string;
    workId: string;
  },
) {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const existing = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  const now = Date.now();
  const streamId =
    existing?._id ??
    (await ctx.db.insert("runtimeStreams", {
      runtime: args.runtime,
      streamId: args.streamId,
      factsNamespace: runtimeNamespace(registration, args.streamId, "facts"),
      currentNamespace: runtimeNamespace(
        registration,
        args.streamId,
        "current",
      ),
      historicalNamespace: runtimeNamespace(
        registration,
        args.streamId,
        "historical",
      ),
      latestVersion: 0,
      createdAt: now,
      updatedAt: now,
    }));
  await ctx.db.patch(streamId, {
    lastWorkId: args.workId,
    lastCommitKey: args.commitKey,
    updatedAt: now,
  });
  await upsertCommitState(ctx, {
    runtime: args.runtime,
    streamId: args.streamId,
    commitKey: args.commitKey,
    workId: args.workId,
    state: "queued",
    queuedAt: now,
  });
  return { workId: args.workId };
}

export async function finalizeRuntimeCommitImpl(
  ctx: MutationCtx,
  args: { workId: string; state: "failed" | "canceled"; error?: string },
) {
  const commit = await ctx.db
    .query("runtimeCommitLog")
    .withIndex("by_workId", (q) => q.eq("workId", args.workId))
    .unique();
  if (!commit) {
    return null;
  }
  await ctx.db.patch(commit._id, {
    state: args.state,
    error: args.error,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
  return commit._id;
}

export async function startRuntimeCommitImpl(
  ctx: MutationCtx,
  args: {
    runtime: string;
    streamId: string;
    commitKey: string;
    workId?: string;
    entryTime?: number;
    currentKey?: string;
    historicalKey?: string;
  },
) {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  if (!stream) {
    throw new Error("Runtime stream must be queued before it can start");
  }
  const existingCommit = await getRuntimeCommitRow(
    ctx,
    args.runtime,
    args.streamId,
    args.commitKey,
  );
  if (existingCommit?.state === "completed") {
    return {
      skipped: true,
      registration,
      stream: toRuntimeStreamState(registration, args.streamId, stream),
    };
  }
  const entryTime = args.entryTime ?? Date.now();
  await upsertCommitState(ctx, {
    runtime: args.runtime,
    streamId: args.streamId,
    commitKey: args.commitKey,
    workId: args.workId,
    state: "running",
    entryTime,
    startedAt: Date.now(),
    currentKey: args.currentKey,
    historicalKey: args.historicalKey,
  });
  return {
    skipped: false,
    registration,
    stream: toRuntimeStreamState(registration, args.streamId, stream),
    sourceVersion: stream.latestVersion + 1,
    entryTime,
  };
}

export async function appendRuntimeHistoryImpl(
  ctx: MutationCtx,
  args: {
    runtime: string;
    streamId: string;
    entryId: string;
    kind: string;
    entryTime: number;
    parentEntryIds?: string[];
    payload?: unknown;
  },
) {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const existing = await ctx.runQuery(components.history.public.read.getEntry, {
    streamType: registration.historyStreamType,
    streamId: args.streamId,
    entryId: args.entryId,
  });
  if (existing) {
    return existing;
  }
  const parentEntryIds =
    args.parentEntryIds ??
    (
      await ctx.runQuery(components.history.public.heads.listHeads, {
        streamType: registration.historyStreamType,
        streamId: args.streamId,
      })
    ).map((head) => head.entryId);
  return await ctx.runMutation(components.history.public.append.append, {
    streamType: registration.historyStreamType,
    streamId: args.streamId,
    entryId: args.entryId,
    kind: args.kind,
    parentEntryIds,
    entryTime: args.entryTime,
    payload: args.payload,
  });
}

export async function applyRuntimeFactsImpl(
  ctx: MutationCtx,
  args: {
    runtime: string;
    streamId: string;
    sourceVersion: number;
    facts: {
      items: Array<{
        entity: string;
        entityType: string;
        scope?: string;
        state?: string;
        order: number[];
        labels?: string[];
        attrs?: Record<string, string | number | boolean>;
      }>;
      edges?: Array<{
        kind: string;
        from: string;
        to: string;
        scope?: string;
      }>;
      partitions?: Array<{
        partition: string;
        scope?: string;
        head?: string;
        tail?: string;
        count: number;
        membersVersion?: number;
      }>;
      projector?: string;
      mode?: "direct" | "event";
    };
  },
) {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  if (!stream) {
    throw new Error("Missing runtime stream");
  }
  return await ctx.runMutation(components.facts.public.sync.upsertFacts, {
    namespace: stream.factsNamespace,
    items: args.facts.items.map((item) => ({
      ...item,
      labels: item.labels ?? [],
    })),
    edges: args.facts.edges ?? [],
    partitions: args.facts.partitions,
    version: args.sourceVersion,
    projector: args.facts.projector ?? registration.runtime,
    mode: args.facts.mode ?? "event",
  });
}

export async function completeRuntimeCommitImpl(
  ctx: MutationCtx,
  args: {
    runtime: string;
    streamId: string;
    commitKey: string;
    workId?: string;
    entryId: string;
    sourceVersion: number;
    entryTime: number;
    latestEntity?: string;
    currentKey?: string;
    historicalKey?: string;
  },
) {
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  if (!stream) {
    throw new Error("Missing runtime stream");
  }
  await ctx.db.patch(stream._id, {
    latestVersion: args.sourceVersion,
    latestEntryId: args.entryId,
    latestEntryTime: args.entryTime,
    latestEntity: args.latestEntity ?? stream.latestEntity,
    lastCommitKey: args.commitKey,
    lastWorkId: args.workId ?? stream.lastWorkId,
    updatedAt: Date.now(),
  });
  await upsertCommitState(ctx, {
    runtime: args.runtime,
    streamId: args.streamId,
    commitKey: args.commitKey,
    workId: args.workId,
    state: "completed",
    entryId: args.entryId,
    sourceVersion: args.sourceVersion,
    entryTime: args.entryTime,
    currentKey: args.currentKey,
    historicalKey: args.historicalKey,
    completedAt: Date.now(),
  });
  return { entryId: args.entryId };
}

export async function getRuntimeCurrentImpl(
  ctx: QueryCtx,
  args: { runtime: string; streamId: string },
): Promise<RuntimeCurrentView> {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  const state = toRuntimeStreamState(registration, args.streamId, stream);
  const facts = (await ctx.runQuery(
    components.facts.public.evaluate.getOrderedFacts,
    { namespace: state.factsNamespace },
  )) as Array<Record<string, unknown>>;
  return {
    ...state,
    latestFact: latestFactFromRows(facts),
  };
}

export async function listRuntimeEvolutionImpl(
  ctx: QueryCtx,
  args: {
    runtime: string;
    streamId: string;
    paginationOpts: { cursor: string | null; numItems: number };
  },
): Promise<RuntimeEvolutionView> {
  const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
  const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
  const state = toRuntimeStreamState(registration, args.streamId, stream);
  const facts = (await ctx.runQuery(
    components.facts.public.evaluate.getOrderedFacts,
    { namespace: state.factsNamespace },
  )) as Array<Record<string, unknown>>;
  const history = await ctx.runQuery(
    components.history.public.read.listEntries,
    {
      streamType: registration.historyStreamType,
      streamId: args.streamId,
      paginationOpts: args.paginationOpts,
    },
  );
  return {
    ...state,
    facts: facts.map((row) => ({
      entity: String(row.entity),
      entityType: String(row.entityType),
      scope: typeof row.scope === "string" ? row.scope : undefined,
      state: typeof row.state === "string" ? row.state : undefined,
      order: Array.isArray(row.order)
        ? row.order.filter(
            (value): value is number => typeof value === "number",
          )
        : [],
      labels: Array.isArray(row.labels)
        ? row.labels.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      attrs:
        row.attrs && typeof row.attrs === "object"
          ? (row.attrs as Record<string, unknown>)
          : undefined,
    })),
    history: history.page.map((entry: RuntimeHistoryEntrySummary) => ({
      entryId: entry.entryId,
      kind: entry.kind,
      entryTime: entry.entryTime,
      parentEntryIds: entry.parentEntryIds,
      payload: entry.payload,
    })),
  };
}

export const registerRuntime = mutation({
  args: runtimeRegistrationValidator,
  handler: registerRuntimeImpl,
});

export const getRuntimeStreamState = query({
  args: runtimeSearchArgsValidator,
  handler: getRuntimeStreamStateImpl,
});

export const markRuntimeCommitQueued = mutation({
  args: markRuntimeCommitQueuedArgs,
  handler: markRuntimeCommitQueuedImpl,
});

export const finalizeRuntimeCommit = mutation({
  args: finalizeRuntimeCommitArgs,
  handler: finalizeRuntimeCommitImpl,
});

export const getRuntimeCurrent = query({
  args: runtimeSearchArgsValidator,
  handler: getRuntimeCurrentImpl,
});

export const listRuntimeEvolution = query({
  args: {
    ...runtimeSearchArgsValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: listRuntimeEvolutionImpl,
});
