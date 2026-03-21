import { paginator } from "convex-helpers/server/pagination";
import type { QueryCtx } from "../../_generated/server";
import type { MemoryChartMetrics } from "../../internal/runtime";
import schema from "../../schema";
import {
  chartMemberSummary,
  chartSummary,
  repartitionEventSummary,
  supportEdgeSummary,
  type MemoryChartDoc,
} from "./shared";
import { emptyMemoryChartMetrics, getMemoryChartNamespaceRow } from "./state";

export async function listMemoryChartsImpl(
  ctx: QueryCtx,
  args: { namespace: string; paginationOpts: { cursor: string | null; numItems: number } },
) {
  const result = paginator(ctx.db, schema)
    .query("memoryCharts")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", args.namespace))
    .order("desc");
  const page = await result.paginate(args.paginationOpts);
  return { ...page, page: page.page.map(chartSummary) };
}

export async function getMemoryChartImpl(
  ctx: QueryCtx,
  args: { chartId: MemoryChartDoc["_id"] },
) {
  const chart = await ctx.db.get(args.chartId);
  return chart ? chartSummary(chart) : null;
}

export async function getMemoryChartNamespaceMetricsImpl(
  ctx: QueryCtx,
  args: { namespace: string },
): Promise<MemoryChartMetrics> {
  const existing = await getMemoryChartNamespaceRow(ctx, args.namespace);
  if (!existing) {
    return emptyMemoryChartMetrics();
  }
  return {
    chartCount: existing.chartCount,
    memberCount: existing.memberCount,
    boundaryCount: existing.boundaryCount,
    ambiguityCount: existing.ambiguityCount,
    negativeLogLikelihoodSum: existing.negativeLogLikelihoodSum,
    descriptionLength: existing.descriptionLength,
    compressionLoss: existing.compressionLoss,
    supportCoverageLoss: existing.supportCoverageLoss,
    overlapPenalty: existing.overlapPenalty,
    coverageEntropy: existing.coverageEntropy,
    preservedInformation: existing.preservedInformation,
    repartitionCount: existing.repartitionCount,
    splitCount: existing.splitCount,
    mergeCount: existing.mergeCount,
    pendingMaintenanceCount: existing.pendingMaintenanceCount,
  };
}

export async function listMemoryChartMembersImpl(
  ctx: QueryCtx,
  args: {
    chartId: MemoryChartDoc["_id"];
    paginationOpts: { cursor: string | null; numItems: number };
  },
) {
  const result = paginator(ctx.db, schema)
    .query("memoryChartMembers")
    .withIndex("by_chart_assignedAt", (q) => q.eq("chartId", args.chartId))
    .order("desc");
  const page = await result.paginate(args.paginationOpts);
  return { ...page, page: page.page.map(chartMemberSummary) };
}

export async function listMemoryChartSupportEdgesImpl(
  ctx: QueryCtx,
  args: { namespace: string; paginationOpts: { cursor: string | null; numItems: number } },
) {
  const result = paginator(ctx.db, schema)
    .query("memoryChartSupportEdges")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", args.namespace))
    .order("desc");
  const page = await result.paginate(args.paginationOpts);
  return { ...page, page: page.page.map(supportEdgeSummary) };
}

export async function listMemoryChartRepartitionEventsImpl(
  ctx: QueryCtx,
  args: { namespace: string; paginationOpts: { cursor: string | null; numItems: number } },
) {
  const result = paginator(ctx.db, schema)
    .query("memoryChartRepartitionEvents")
    .withIndex("by_namespace_entryTime", (q) => q.eq("namespace", args.namespace))
    .order("desc");
  const page = await result.paginate(args.paginationOpts);
  return { ...page, page: page.page.map(repartitionEventSummary) };
}
