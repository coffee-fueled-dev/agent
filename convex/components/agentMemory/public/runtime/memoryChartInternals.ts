import type { MutationCtx } from "../../_generated/server";
import type { MemoryChartMetrics } from "../../internal/runtime";
import {
  chartPairKey,
  type MemoryChartDoc,
  type MemoryChartSupportEdgeDoc,
} from "./shared";
import { getMemoryChartNamespaceRow } from "./state";

export function chartObjective(chart: {
  descriptionLength: number;
  supportCoverageLoss: number;
  overlapPenalty: number;
  compressionLoss: number;
  preservedInformation: number;
}) {
  return (
    chart.descriptionLength +
    chart.supportCoverageLoss +
    chart.overlapPenalty +
    chart.compressionLoss -
    chart.preservedInformation
  );
}

export async function syncMemoryChartNamespaceMetrics(
  ctx: MutationCtx,
  namespace: string,
) {
  const charts = await ctx.db
    .query("memoryCharts")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", namespace))
    .collect();
  const existing = await getMemoryChartNamespaceRow(ctx, namespace);
  const now = Date.now();
  const metrics: MemoryChartMetrics = {
    chartCount: charts.length,
    memberCount: charts.reduce(
      (total: number, chart: MemoryChartDoc) => total + chart.memberCount,
      0,
    ),
    boundaryCount: charts.reduce(
      (total: number, chart: MemoryChartDoc) => total + chart.boundaryCount,
      0,
    ),
    ambiguityCount: charts.reduce(
      (total: number, chart: MemoryChartDoc) => total + chart.ambiguityCount,
      0,
    ),
    negativeLogLikelihoodSum: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.negativeLogLikelihoodSum ?? 0),
      0,
    ),
    descriptionLength: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.descriptionLength ?? 0),
      0,
    ),
    compressionLoss: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.compressionLoss ?? 0),
      0,
    ),
    supportCoverageLoss: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.supportCoverageLoss ?? 0),
      0,
    ),
    overlapPenalty: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.overlapPenalty ?? 0),
      0,
    ),
    coverageEntropy: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.coverageEntropy ?? 0),
      0,
    ),
    preservedInformation: charts.reduce(
      (total: number, chart: MemoryChartDoc) =>
        total + (chart.preservedInformation ?? 0),
      0,
    ),
    repartitionCount: existing?.repartitionCount ?? 0,
    splitCount: existing?.splitCount ?? 0,
    mergeCount: existing?.mergeCount ?? 0,
    pendingMaintenanceCount: existing?.pendingMaintenanceCount ?? 0,
  };

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...metrics,
      updatedAt: now,
    });
    return await ctx.db.get(existing._id);
  }

  const id = await ctx.db.insert("memoryChartNamespaces", {
    namespace,
    ...metrics,
    lastMaintenanceQueuedAt: undefined,
    lastMaintenanceCompletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

export async function upsertMemoryChartSupportEdge(
  ctx: MutationCtx,
  args: {
    namespace: string;
    fromChartId: MemoryChartDoc["_id"];
    toChartId: MemoryChartDoc["_id"];
    overlapMass: number;
    coverageEntropy: number;
    updatedAt: number;
  },
) {
  const pairKey = chartPairKey(
    String(args.fromChartId),
    String(args.toChartId),
  );
  const existing = await ctx.db
    .query("memoryChartSupportEdges")
    .withIndex("by_namespace_pair", (q) =>
      q.eq("namespace", args.namespace).eq("chartPairKey", pairKey),
    )
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      supportCount: existing.supportCount + 1,
      overlapMass: existing.overlapMass + args.overlapMass,
      coverageEntropySum: existing.coverageEntropySum + args.coverageEntropy,
      updatedAt: args.updatedAt,
    });
    return existing._id;
  }
  return await ctx.db.insert("memoryChartSupportEdges", {
    namespace: args.namespace,
    chartPairKey: pairKey,
    fromChartId: args.fromChartId,
    toChartId: args.toChartId,
    supportCount: 1,
    overlapMass: args.overlapMass,
    coverageEntropySum: args.coverageEntropy,
    updatedAt: args.updatedAt,
    createdAt: args.updatedAt,
  });
}

export async function deleteSupportEdgesForChart(
  ctx: MutationCtx,
  namespace: string,
  chartId: MemoryChartDoc["_id"],
) {
  const edges = await ctx.db
    .query("memoryChartSupportEdges")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", namespace))
    .collect();
  await Promise.all(
    edges
      .filter(
        (edge: MemoryChartSupportEdgeDoc) =>
          edge.fromChartId === chartId || edge.toChartId === chartId,
      )
      .map((edge: MemoryChartSupportEdgeDoc) => ctx.db.delete(edge._id)),
  );
}

export async function recordMemoryChartRepartitionEvent(
  ctx: MutationCtx,
  args: {
    namespace: string;
    kind: "split" | "merge" | "evaluate";
    accepted: boolean;
    targetChartIds: string[];
    resultChartIds: string[];
    deltaDescriptionLength: number;
    posteriorEvidence: number;
    compressionDelta: number;
    supportCoverageDelta: number;
    overlapDelta: number;
    details?: Record<string, string | number | boolean | null>;
    entryTime: number;
  },
) {
  return await ctx.db.insert("memoryChartRepartitionEvents", {
    namespace: args.namespace,
    kind: args.kind,
    accepted: args.accepted,
    targetChartIds: args.targetChartIds,
    resultChartIds: args.resultChartIds,
    deltaDescriptionLength: args.deltaDescriptionLength,
    posteriorEvidence: args.posteriorEvidence,
    compressionDelta: args.compressionDelta,
    supportCoverageDelta: args.supportCoverageDelta,
    overlapDelta: args.overlapDelta,
    details: args.details,
    entryTime: args.entryTime,
    createdAt: args.entryTime,
    updatedAt: args.entryTime,
  });
}
