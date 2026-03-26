import type { Doc } from "../../_generated/dataModel";
import type {
  MemoryChartMember,
  MemoryChartRepartitionEvent,
  MemoryChartSummary,
  MemoryChartSupportEdge,
  RuntimeEvolutionView,
} from "../../internal/runtime";

export type MemoryChartDoc = Doc<"memoryCharts">;
export type MemoryChartMemberDoc = Doc<"memoryChartMembers">;
export type MemoryChartNamespaceDoc = Doc<"memoryChartNamespaces">;
export type MemoryChartSupportEdgeDoc = Doc<"memoryChartSupportEdges">;
export type MemoryChartRepartitionEventDoc =
  Doc<"memoryChartRepartitionEvents">;
export type RuntimeHistoryEntrySummary =
  RuntimeEvolutionView["history"][number];

export const MAX_CHART_CANDIDATES = 64;
export const MAINTENANCE_MIN_MEMBERS = 4;
export const PRIOR_TANGENT_VARIANCE = 0.2;

export function summarizeVector(values: number[]) {
  if (values.length === 0) {
    return { norm: 0, mean: 0 };
  }
  let squareSum = 0;
  let total = 0;
  for (const value of values) {
    squareSum += value * value;
    total += value;
  }
  return {
    norm: Math.sqrt(squareSum),
    mean: total / values.length,
  };
}

export function chartPairKey(leftChartId: string, rightChartId: string) {
  return [leftChartId, rightChartId].sort().join(":");
}

export function chartSummary(chart: MemoryChartDoc): MemoryChartSummary {
  const centroid = summarizeVector(chart.meanDirection ?? chart.centroid);
  return {
    chartId: chart._id,
    namespace: chart.namespace,
    chartKey: chart.chartKey,
    memberCount: chart.memberCount,
    assignmentCount: chart.assignmentCount ?? chart.memberCount,
    boundaryCount: chart.boundaryCount,
    ambiguityCount: chart.ambiguityCount,
    radius: chart.radius,
    centroidNorm: centroid.norm,
    meanVariance: chart.tangentVariance ?? 0,
    tangentVariance: chart.tangentVariance ?? 0,
    meanGeodesicResidual: chart.meanGeodesicResidual ?? 0,
    negativeLogLikelihoodSum: chart.negativeLogLikelihoodSum ?? 0,
    descriptionLength: chart.descriptionLength ?? 0,
    posteriorEvidence: chart.posteriorEvidence ?? 0,
    compressionLoss: chart.compressionLoss ?? 0,
    supportCoverageLoss: chart.supportCoverageLoss ?? 0,
    overlapPenalty: chart.overlapPenalty ?? 0,
    coverageEntropy: chart.coverageEntropy ?? 0,
    preservedInformation: chart.preservedInformation ?? 0,
    repartitionEpoch: chart.repartitionEpoch ?? 0,
    repartitionCount: chart.repartitionCount ?? 0,
    lastRepartitionAt: chart.lastRepartitionAt ?? null,
    lastEvaluationAt: chart.lastEvaluationAt ?? null,
    lastDeltaDescriptionLength: chart.lastDeltaDescriptionLength ?? null,
    lastPosteriorEvidence: chart.lastPosteriorEvidence ?? null,
    sampleKey: chart.sampleKey ?? null,
    sampleTitle: chart.sampleTitle ?? null,
    sampleSummary: chart.sampleSummary ?? null,
    lastAssignedAt: chart.lastAssignedAt,
    createdAt: chart.createdAt,
    updatedAt: chart.updatedAt,
  };
}

export function chartMemberSummary(
  member: MemoryChartMemberDoc,
): MemoryChartMember {
  return {
    chartMemberId: member._id,
    chartId: member.chartId,
    namespace: member.namespace,
    entryId: member.entryId,
    key: member.key,
    title: member.title ?? null,
    summary: member.summary,
    sourceType: member.sourceType,
    sourceKind: member.sourceKind ?? null,
    storageId: member.storageId ?? null,
    mimeType: member.mimeType ?? null,
    fileName: member.fileName ?? null,
    metadata: member.metadata ?? {},
    embedding: member.embedding ?? [],
    geodesicResidual: member.geodesicResidual ?? 0,
    localNegativeLogLikelihood: member.localNegativeLogLikelihood ?? 0,
    posteriorProbability: member.posteriorProbability ?? 0,
    assignmentEntropy: member.assignmentEntropy ?? 0,
    supportCoverageLoss: member.supportCoverageLoss ?? 0,
    preservedInformation: member.preservedInformation ?? 0,
    mahalanobisDistance: member.mahalanobisDistance,
    ambiguityScore: member.ambiguityScore ?? null,
    boundaryScore: member.boundaryScore ?? null,
    repartitionEpoch: member.repartitionEpoch ?? 0,
    assignedAt: member.assignedAt,
  };
}

export function supportEdgeSummary(
  edge: MemoryChartSupportEdgeDoc,
): MemoryChartSupportEdge {
  return {
    edgeId: edge._id,
    namespace: edge.namespace,
    chartPairKey: edge.chartPairKey,
    fromChartId: edge.fromChartId,
    toChartId: edge.toChartId,
    supportCount: edge.supportCount,
    overlapMass: edge.overlapMass,
    coverageEntropySum: edge.coverageEntropySum,
    updatedAt: edge.updatedAt,
  };
}

export function repartitionEventSummary(
  event: MemoryChartRepartitionEventDoc,
): MemoryChartRepartitionEvent {
  return {
    eventId: event._id,
    namespace: event.namespace,
    kind: event.kind,
    accepted: event.accepted,
    targetChartIds: event.targetChartIds,
    resultChartIds: event.resultChartIds,
    deltaDescriptionLength: event.deltaDescriptionLength,
    posteriorEvidence: event.posteriorEvidence,
    compressionDelta: event.compressionDelta,
    supportCoverageDelta: event.supportCoverageDelta,
    overlapDelta: event.overlapDelta,
    details: event.details ?? {},
    entryTime: event.entryTime,
  };
}

export function latestFactFromRows(rows: Array<Record<string, unknown>>) {
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
