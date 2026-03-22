import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  type MemoryChartMetrics,
  normalizeRuntimeState,
  type RuntimeStreamState,
} from "../../internal/runtime";

type RuntimeReadCtx = Pick<QueryCtx, "db">;
type RuntimeWriteCtx = Pick<MutationCtx, "db">;

export async function getMemoryChartNamespaceRow(
  ctx: RuntimeReadCtx,
  namespace: string,
) {
  return await ctx.db
    .query("memoryChartNamespaces")
    .withIndex("by_namespace", (q) => q.eq("namespace", namespace))
    .unique();
}

export async function getRuntimeRegistrationRow(
  ctx: RuntimeReadCtx,
  runtime: string,
) {
  const registration = await ctx.db
    .query("runtimeRegistrations")
    .withIndex("by_runtime", (q) => q.eq("runtime", runtime))
    .unique();
  if (!registration) {
    throw new Error(`Unknown agentMemory runtime: ${runtime}`);
  }
  return registration;
}

export async function getRuntimeStreamRow(
  ctx: RuntimeReadCtx,
  runtime: string,
  streamId: string,
) {
  return await ctx.db
    .query("runtimeStreams")
    .withIndex("by_runtime_stream", (q) =>
      q.eq("runtime", runtime).eq("streamId", streamId),
    )
    .unique();
}

export async function getRuntimeCommitRow(
  ctx: RuntimeReadCtx,
  runtime: string,
  streamId: string,
  commitKey: string,
) {
  return await ctx.db
    .query("runtimeCommitLog")
    .withIndex("by_runtime_stream_commitKey", (q) =>
      q
        .eq("runtime", runtime)
        .eq("streamId", streamId)
        .eq("commitKey", commitKey),
    )
    .unique();
}

export function runtimeNamespace(
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

export function toRuntimeStreamState(
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

export async function upsertCommitState(
  ctx: RuntimeWriteCtx,
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

export function emptyMemoryChartMetrics(): MemoryChartMetrics {
  return {
    chartCount: 0,
    memberCount: 0,
    boundaryCount: 0,
    ambiguityCount: 0,
    negativeLogLikelihoodSum: 0,
    descriptionLength: 0,
    compressionLoss: 0,
    supportCoverageLoss: 0,
    overlapPenalty: 0,
    coverageEntropy: 0,
    preservedInformation: 0,
    repartitionCount: 0,
    splitCount: 0,
    mergeCount: 0,
    pendingMaintenanceCount: 0,
  };
}
