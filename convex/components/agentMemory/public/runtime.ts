import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import {
  normalizeRuntimeState,
  type RuntimeCurrentView,
  type RuntimeEvolutionView,
  type RuntimeRegistrationArgs,
  runtimeRegistrationValidator,
  runtimeSearchArgsValidator,
  type RuntimeStreamState,
} from "../internal/runtime";

function latestFactFromRows(rows: Array<Record<string, unknown>>) {
  const latest = rows.at(-1);
  if (!latest) {
    return null;
  }
  return {
    entity: String(latest.entity),
    entityType: String(latest.entityType),
    scope: typeof latest.scope === "string" ? latest.scope : undefined,
    state: typeof latest.state === "string" ? latest.state : undefined,
    order: Array.isArray(latest.order)
      ? latest.order.filter(
          (value): value is number => typeof value === "number",
        )
      : [],
    labels: Array.isArray(latest.labels)
      ? latest.labels.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    attrs:
      latest.attrs && typeof latest.attrs === "object"
        ? (latest.attrs as Record<string, unknown>)
        : undefined,
  };
}

async function getRuntimeRegistrationRow(ctx: any, runtime: string) {
  const registration = await ctx.db
    .query("runtimeRegistrations")
    .withIndex("by_runtime", (q: any) => q.eq("runtime", runtime))
    .unique();
  if (!registration) {
    throw new Error(`Unknown agentMemory runtime: ${runtime}`);
  }
  return registration;
}

async function getRuntimeStreamRow(
  ctx: any,
  runtime: string,
  streamId: string,
) {
  return await ctx.db
    .query("runtimeStreams")
    .withIndex("by_runtime_stream", (q: any) =>
      q.eq("runtime", runtime).eq("streamId", streamId),
    )
    .unique();
}

async function getRuntimeCommitRow(
  ctx: any,
  runtime: string,
  streamId: string,
  commitKey: string,
) {
  return await ctx.db
    .query("runtimeCommitLog")
    .withIndex("by_runtime_stream_commitKey", (q: any) =>
      q
        .eq("runtime", runtime)
        .eq("streamId", streamId)
        .eq("commitKey", commitKey),
    )
    .unique();
}

function runtimeNamespace(
  registration: Awaited<ReturnType<typeof getRuntimeRegistrationRow>>,
  streamId: string,
  kind: "facts" | "current" | "historical",
) {
  const suffix =
    kind === "facts"
      ? registration.factsNamespaceSuffix
      : kind === "current"
        ? registration.currentNamespaceSuffix
        : registration.historicalNamespaceSuffix;
  return `${registration.runtime}:${streamId}:${suffix}`;
}

function toRuntimeStreamState(
  registration: Awaited<ReturnType<typeof getRuntimeRegistrationRow>>,
  streamId: string,
  stream: Awaited<ReturnType<typeof getRuntimeStreamRow>>,
): RuntimeStreamState {
  return normalizeRuntimeState({
    runtime: registration.runtime,
    streamId,
    factsNamespace:
      stream?.factsNamespace ??
      runtimeNamespace(registration, streamId, "facts"),
    currentNamespace:
      stream?.currentNamespace ??
      runtimeNamespace(registration, streamId, "current"),
    historicalNamespace:
      stream?.historicalNamespace ??
      runtimeNamespace(registration, streamId, "historical"),
    latestVersion: stream?.latestVersion,
    latestEntryId: stream?.latestEntryId,
    latestEntryTime: stream?.latestEntryTime,
    latestEntity: stream?.latestEntity,
    lastCommitKey: stream?.lastCommitKey,
    lastWorkId: stream?.lastWorkId,
  });
}

async function upsertCommitState(
  ctx: any,
  args: {
    runtime: string;
    streamId: string;
    commitKey: string;
    workId?: string;
    state: "queued" | "running" | "completed" | "failed" | "canceled";
    error?: string;
    entryId?: string;
    sourceVersion?: number;
    entryTime?: number;
    currentKey?: string;
    historicalKey?: string;
    queuedAt?: number;
    startedAt?: number;
    completedAt?: number;
  },
) {
  const existing = await getRuntimeCommitRow(
    ctx,
    args.runtime,
    args.streamId,
    args.commitKey,
  );
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      workId: args.workId ?? existing.workId,
      state: args.state,
      error: args.error,
      entryId: args.entryId ?? existing.entryId,
      sourceVersion: args.sourceVersion ?? existing.sourceVersion,
      entryTime: args.entryTime ?? existing.entryTime,
      currentKey: args.currentKey ?? existing.currentKey,
      historicalKey: args.historicalKey ?? existing.historicalKey,
      queuedAt: args.queuedAt ?? existing.queuedAt,
      startedAt: args.startedAt ?? existing.startedAt,
      completedAt: args.completedAt ?? existing.completedAt,
      attempts:
        args.state === "running" ? existing.attempts + 1 : existing.attempts,
      updatedAt: now,
    });
    return existing;
  }

  const id = await ctx.db.insert("runtimeCommitLog", {
    runtime: args.runtime,
    streamId: args.streamId,
    commitKey: args.commitKey,
    workId: args.workId,
    state: args.state,
    attempts: args.state === "running" ? 1 : 0,
    error: args.error,
    entryId: args.entryId,
    sourceVersion: args.sourceVersion,
    entryTime: args.entryTime,
    currentKey: args.currentKey,
    historicalKey: args.historicalKey,
    queuedAt: args.queuedAt,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

export const registerRuntime = mutation({
  args: runtimeRegistrationValidator,
  handler: async (ctx, args: RuntimeRegistrationArgs) => {
    const existing = await ctx.db
      .query("runtimeRegistrations")
      .withIndex("by_runtime", (q: any) => q.eq("runtime", args.runtime))
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
  },
});

export const getRuntimeRegistration = query({
  args: { runtime: v.string() },
  handler: async (ctx, args) => {
    return await getRuntimeRegistrationRow(ctx, args.runtime);
  },
});

export const getRuntimeStreamState = query({
  args: runtimeSearchArgsValidator,
  handler: async (ctx, args): Promise<RuntimeStreamState> => {
    const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
    const stream = await getRuntimeStreamRow(ctx, args.runtime, args.streamId);
    return toRuntimeStreamState(registration, args.streamId, stream);
  },
});

export const markRuntimeCommitQueued = mutation({
  args: {
    runtime: v.string(),
    streamId: v.string(),
    commitKey: v.string(),
    workId: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
    const existing = await getRuntimeStreamRow(
      ctx,
      args.runtime,
      args.streamId,
    );
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    await ctx.db.patch(streamId, {
      lastWorkId: args.workId,
      lastCommitKey: args.commitKey,
      updatedAt: Date.now(),
    });
    await upsertCommitState(ctx, {
      runtime: args.runtime,
      streamId: args.streamId,
      commitKey: args.commitKey,
      workId: args.workId,
      state: "queued",
      queuedAt: Date.now(),
    });
    return { workId: args.workId };
  },
});

export const finalizeRuntimeCommit = mutation({
  args: {
    workId: v.string(),
    state: v.union(v.literal("failed"), v.literal("canceled")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const commit = await ctx.db
      .query("runtimeCommitLog")
      .withIndex("by_workId", (q: any) => q.eq("workId", args.workId))
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
  },
});

export const startRuntimeCommit = mutation({
  args: {
    runtime: v.string(),
    streamId: v.string(),
    commitKey: v.string(),
    workId: v.optional(v.string()),
    entryTime: v.optional(v.number()),
    currentKey: v.optional(v.string()),
    historicalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  },
});

export const appendRuntimeHistory = mutation({
  args: {
    runtime: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    kind: v.string(),
    entryTime: v.number(),
    parentEntryIds: v.optional(v.array(v.string())),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const registration = await getRuntimeRegistrationRow(ctx, args.runtime);
    const existing = await ctx.runQuery(
      components.history.public.read.getEntry,
      {
        streamType: registration.historyStreamType,
        streamId: args.streamId,
        entryId: args.entryId,
      },
    );
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
  },
});

export const applyRuntimeFacts = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
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
  },
});

export const completeRuntimeCommit = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
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
  },
});

export const getRuntimeCurrent = query({
  args: runtimeSearchArgsValidator,
  handler: async (ctx, args): Promise<RuntimeCurrentView> => {
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
  },
});

export const listRuntimeEvolution = query({
  args: {
    ...runtimeSearchArgsValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<RuntimeEvolutionView> => {
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
      history: history.page.map((entry: any) => ({
        entryId: entry.entryId,
        kind: entry.kind,
        entryTime: entry.entryTime,
        parentEntryIds: entry.parentEntryIds,
        payload: entry.payload,
      })),
    };
  },
});
