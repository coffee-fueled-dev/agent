import { v } from "convex/values";
import {
  buildChartStatistics,
  chartDescriptionLength,
  farthestPointSplit,
  normalizeEmbedding,
  softAssignments,
  sphericalPointMetrics,
} from "../../internal/chartAtlas";
import {
  memoryChartUpdateValidator,
  type MemoryChartUpdateArgs,
} from "../../internal/runtime";
import type { MutationCtx } from "../../_generated/server";
import {
  chartObjective,
  deleteSupportEdgesForChart,
  recordMemoryChartRepartitionEvent,
  syncMemoryChartNamespaceMetrics,
  upsertMemoryChartSupportEdge,
} from "./memoryChartInternals";
import { getMemoryChartNamespaceRow } from "./state";
import {
  MAINTENANCE_MIN_MEMBERS,
  MAX_CHART_CANDIDATES,
  PRIOR_TANGENT_VARIANCE,
  type MemoryChartDoc,
  type MemoryChartSupportEdgeDoc,
} from "./shared";

export const memoryChartMaintenanceArgs = {
  namespace: v.string(),
  entryTime: v.number(),
};

export { memoryChartUpdateValidator };

export async function upsertMemoryChartAssignmentImpl(
  ctx: MutationCtx,
  args: MemoryChartUpdateArgs,
) {
  const point = normalizeEmbedding(args.embedding);
  const existingMember = await ctx.db
    .query("memoryChartMembers")
    .withIndex("by_namespace_entryId", (q) =>
      q.eq("namespace", args.namespace).eq("entryId", args.entryId),
    )
    .unique();
  if (existingMember) {
    return {
      chartId: existingMember.chartId,
      createdChart: false,
      createdMember: false,
      ambiguous: existingMember.ambiguityScore != null,
      boundary: existingMember.boundaryScore != null,
    };
  }

  const candidates = await ctx.db
    .query("memoryCharts")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", args.namespace))
    .order("desc")
    .take(MAX_CHART_CANDIDATES);
  const assignment = softAssignments(
    point,
    candidates.map((chart) => ({
      chartId: String(chart._id),
      meanDirection: chart.meanDirection ?? chart.centroid,
      tangentVariance: chart.tangentVariance ?? 1,
      assignmentCount: chart.assignmentCount ?? chart.memberCount,
    })),
  );
  const best = assignment.best
    ? candidates.find((chart) => String(chart._id) === assignment.best?.chartId)
    : null;
  const second = assignment.second
    ? candidates.find((chart) => String(chart._id) === assignment.second?.chartId)
    : null;
  const assignObjective =
    assignment.best == null
      ? Number.POSITIVE_INFINITY
      : assignment.best.localNegativeLogLikelihood +
        assignment.supportCoverageLoss +
        assignment.overlapPenalty +
        assignment.compressionLoss -
        assignment.preservedInformation;
  const spawnObjective = chartDescriptionLength(
    0.5 * Math.log(Math.PI * 2 * PRIOR_TANGENT_VARIANCE),
    1,
    candidates.length + 1,
  );
  const shouldSpawn = !best || spawnObjective < assignObjective;
  const ambiguous = (assignment.second?.posteriorProbability ?? 0) > 0.15;

  let chartId: MemoryChartDoc["_id"];
  let createdChart = false;
  let createdMember = false;

  if (shouldSpawn) {
    const stats = buildChartStatistics([point]);
    chartId = await ctx.db.insert("memoryCharts", {
      namespace: args.namespace,
      chartKey: `chart:${crypto.randomUUID()}`,
      centroid: stats.meanDirection,
      variance: [stats.tangentVariance],
      radius: stats.radius,
      meanDirection: stats.meanDirection,
      sumVector: stats.sumVector,
      resultantNorm: stats.resultantNorm,
      tangentVariance: stats.tangentVariance,
      meanGeodesicResidual: stats.meanGeodesicResidual,
      negativeLogLikelihoodSum: stats.negativeLogLikelihoodSum,
      descriptionLength: stats.descriptionLength,
      posteriorEvidence: 0,
      compressionLoss: 0,
      supportCoverageLoss: 0,
      overlapPenalty: 0,
      coverageEntropy: 0,
      preservedInformation: 1,
      memberCount: 1,
      assignmentCount: 1,
      recentAssignmentCount: 1,
      boundaryCount: 0,
      ambiguityCount: 0,
      repartitionEpoch: 0,
      repartitionCount: 0,
      sampleEntryId: args.entryId,
      sampleKey: args.key,
      sampleTitle: args.title,
      sampleSummary: args.summary,
      parentChartId: best?._id,
      lastAssignedAt: args.entryTime,
      createdAt: args.entryTime,
      updatedAt: args.entryTime,
    });
    createdChart = true;
  } else {
    chartId = best._id;
    const existingMembers = await ctx.db
      .query("memoryChartMembers")
      .withIndex("by_chart_assignedAt", (q) => q.eq("chartId", chartId))
      .collect();
    const stats = buildChartStatistics([
      ...existingMembers.map((member) => member.embedding),
      point,
    ]);
    const localFit = existingMembers.reduce(
      (total, member) => total + (member.localNegativeLogLikelihood ?? 0),
      0,
    );
    const supportLoss = existingMembers.reduce(
      (total, member) => total + (member.supportCoverageLoss ?? 0),
      0,
    );
    const overlapMass = existingMembers.reduce(
      (total, member) => total + (member.boundaryScore ?? 0),
      0,
    );
    const coverageEntropy = existingMembers.reduce(
      (total, member) => total + (member.assignmentEntropy ?? 0),
      0,
    );
    const preservedInformation = existingMembers.reduce(
      (total, member) => total + (member.preservedInformation ?? 0),
      0,
    );
    await ctx.db.patch(best._id, {
      centroid: stats.meanDirection,
      variance: [stats.tangentVariance],
      radius: stats.radius,
      meanDirection: stats.meanDirection,
      sumVector: stats.sumVector,
      resultantNorm: stats.resultantNorm,
      tangentVariance: stats.tangentVariance,
      meanGeodesicResidual: stats.meanGeodesicResidual,
      negativeLogLikelihoodSum:
        localFit + (assignment.best?.localNegativeLogLikelihood ?? 0),
      descriptionLength: chartDescriptionLength(
        localFit + (assignment.best?.localNegativeLogLikelihood ?? 0),
        existingMembers.length + 1,
      ),
      posteriorEvidence: best.posteriorEvidence ?? 0,
      compressionLoss: coverageEntropy + assignment.compressionLoss,
      supportCoverageLoss: supportLoss + assignment.supportCoverageLoss,
      overlapPenalty: overlapMass + assignment.overlapPenalty,
      coverageEntropy: coverageEntropy + assignment.coverageEntropy,
      preservedInformation:
        preservedInformation + assignment.preservedInformation,
      memberCount: best.memberCount + 1,
      assignmentCount: (best.assignmentCount ?? best.memberCount) + 1,
      recentAssignmentCount: (best.recentAssignmentCount ?? 0) + 1,
      boundaryCount:
        best.boundaryCount + (assignment.overlapPenalty > 0 ? 1 : 0),
      ambiguityCount: best.ambiguityCount + (ambiguous ? 1 : 0),
      sampleEntryId: best.sampleEntryId ?? args.entryId,
      sampleKey: best.sampleKey ?? args.key,
      sampleTitle: best.sampleTitle ?? args.title,
      sampleSummary: best.sampleSummary ?? args.summary,
      lastAssignedAt: args.entryTime,
      updatedAt: args.entryTime,
    });
  }

  await ctx.db.insert("memoryChartMembers", {
    namespace: args.namespace,
    chartId,
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
    embedding: point,
    geodesicResidual: shouldSpawn
      ? 0
      : (assignment.best?.geodesicResidual ?? 0),
    localNegativeLogLikelihood: shouldSpawn
      ? 0
      : (assignment.best?.localNegativeLogLikelihood ?? 0),
    posteriorProbability: shouldSpawn
      ? 1
      : (assignment.best?.posteriorProbability ?? 1),
    assignmentEntropy: assignment.coverageEntropy,
    supportCoverageLoss: assignment.supportCoverageLoss,
    preservedInformation: assignment.preservedInformation,
    mahalanobisDistance: shouldSpawn
      ? 0
      : (assignment.best?.geodesicResidual ?? 0),
    ambiguityScore: ambiguous ? assignment.coverageEntropy : undefined,
    boundaryScore: assignment.second?.posteriorProbability ?? undefined,
    repartitionEpoch: shouldSpawn ? 0 : (best?.repartitionEpoch ?? 0),
    assignedAt: args.entryTime,
    createdAt: args.entryTime,
    updatedAt: args.entryTime,
  });
  createdMember = true;

  if (!shouldSpawn && second) {
    await upsertMemoryChartSupportEdge(ctx, {
      namespace: args.namespace,
      fromChartId: chartId,
      toChartId: second._id,
      overlapMass: assignment.overlapPenalty,
      coverageEntropy: assignment.coverageEntropy,
      updatedAt: args.entryTime,
    });
  }

  await syncMemoryChartNamespaceMetrics(ctx, args.namespace);

  return {
    chartId,
    createdChart,
    createdMember,
    ambiguous,
    boundary: assignment.overlapPenalty > 0,
  };
}

export async function markMemoryChartMaintenanceQueuedImpl(
  ctx: MutationCtx,
  args: { namespace: string; entryTime: number },
) {
  const row =
    (await getMemoryChartNamespaceRow(ctx, args.namespace)) ??
    (await syncMemoryChartNamespaceMetrics(ctx, args.namespace));

  if (!row) {
    return null;
  }

  await ctx.db.patch(row._id, {
    pendingMaintenanceCount: row.pendingMaintenanceCount + 1,
    lastMaintenanceQueuedAt: args.entryTime,
    updatedAt: args.entryTime,
  });
  return row._id;
}

export async function completeMemoryChartMaintenanceImpl(
  ctx: MutationCtx,
  args: { namespace: string; entryTime: number },
) {
  const row = await getMemoryChartNamespaceRow(ctx, args.namespace);
  if (!row) {
    return null;
  }
  await ctx.db.patch(row._id, {
    pendingMaintenanceCount: Math.max(0, row.pendingMaintenanceCount - 1),
    lastMaintenanceCompletedAt: args.entryTime,
    updatedAt: args.entryTime,
  });
  return row._id;
}

function emptyMaintenanceResult() {
  return {
    accepted: false,
    kind: "evaluate" as const,
    createdChartIds: [] as string[],
    deletedChartIds: [] as string[],
  };
}

export async function maintainMemoryChartNamespaceImpl(
  ctx: MutationCtx,
  args: { namespace: string; entryTime: number },
) {
  const charts = await ctx.db
    .query("memoryCharts")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", args.namespace))
    .collect();
  if (charts.length === 0) {
    await syncMemoryChartNamespaceMetrics(ctx, args.namespace);
    return emptyMaintenanceResult();
  }

  const splitCandidate = charts
    .filter((chart) => chart.memberCount >= MAINTENANCE_MIN_MEMBERS)
    .sort((left, right) => chartObjective(right) - chartObjective(left))[0];

  if (splitCandidate) {
    const members = await ctx.db
      .query("memoryChartMembers")
      .withIndex("by_chart_assignedAt", (q) => q.eq("chartId", splitCandidate._id))
      .collect();
    const split = farthestPointSplit(members.map((member) => member.embedding));
    if (split && split.clusterA.length > 0 && split.clusterB.length > 0) {
      const childAEnvelope = split.clusterA.reduce(
        (total, point) => {
          const envelope = softAssignments(point, [
            {
              meanDirection: split.statsA.meanDirection,
              tangentVariance: split.statsA.tangentVariance,
            },
            {
              meanDirection: split.statsB.meanDirection,
              tangentVariance: split.statsB.tangentVariance,
            },
          ]);
          return {
            compressionLoss: total.compressionLoss + envelope.compressionLoss,
            supportCoverageLoss:
              total.supportCoverageLoss + envelope.supportCoverageLoss,
            overlapPenalty: total.overlapPenalty + envelope.overlapPenalty,
            preservedInformation:
              total.preservedInformation + envelope.preservedInformation,
          };
        },
        {
          compressionLoss: 0,
          supportCoverageLoss: 0,
          overlapPenalty: 0,
          preservedInformation: 0,
        },
      );
      const childBEnvelope = split.clusterB.reduce(
        (total, point) => {
          const envelope = softAssignments(point, [
            {
              meanDirection: split.statsA.meanDirection,
              tangentVariance: split.statsA.tangentVariance,
            },
            {
              meanDirection: split.statsB.meanDirection,
              tangentVariance: split.statsB.tangentVariance,
            },
          ]);
          return {
            compressionLoss: total.compressionLoss + envelope.compressionLoss,
            supportCoverageLoss:
              total.supportCoverageLoss + envelope.supportCoverageLoss,
            overlapPenalty: total.overlapPenalty + envelope.overlapPenalty,
            preservedInformation:
              total.preservedInformation + envelope.preservedInformation,
          };
        },
        {
          compressionLoss: 0,
          supportCoverageLoss: 0,
          overlapPenalty: 0,
          preservedInformation: 0,
        },
      );

      const currentObjective = chartObjective(splitCandidate);
      const candidateObjective =
        split.statsA.descriptionLength +
        split.statsB.descriptionLength +
        childAEnvelope.compressionLoss +
        childBEnvelope.compressionLoss +
        childAEnvelope.supportCoverageLoss +
        childBEnvelope.supportCoverageLoss +
        childAEnvelope.overlapPenalty +
        childBEnvelope.overlapPenalty -
        childAEnvelope.preservedInformation -
        childBEnvelope.preservedInformation;
      const deltaDescriptionLength =
        split.statsA.descriptionLength +
        split.statsB.descriptionLength -
        splitCandidate.descriptionLength;
      const posteriorEvidence = currentObjective - candidateObjective;
      if (posteriorEvidence > 0) {
        const newChartId = await ctx.db.insert("memoryCharts", {
          namespace: args.namespace,
          chartKey: `chart:${crypto.randomUUID()}`,
          centroid: split.statsB.meanDirection,
          variance: [split.statsB.tangentVariance],
          radius: split.statsB.radius,
          meanDirection: split.statsB.meanDirection,
          sumVector: split.statsB.sumVector,
          resultantNorm: split.statsB.resultantNorm,
          tangentVariance: split.statsB.tangentVariance,
          meanGeodesicResidual: split.statsB.meanGeodesicResidual,
          negativeLogLikelihoodSum: split.statsB.negativeLogLikelihoodSum,
          descriptionLength: split.statsB.descriptionLength,
          posteriorEvidence,
          compressionLoss: childBEnvelope.compressionLoss,
          supportCoverageLoss: childBEnvelope.supportCoverageLoss,
          overlapPenalty: childBEnvelope.overlapPenalty,
          coverageEntropy: childBEnvelope.compressionLoss,
          preservedInformation: childBEnvelope.preservedInformation,
          memberCount: split.clusterB.length,
          assignmentCount: split.clusterB.length,
          recentAssignmentCount: split.clusterB.length,
          boundaryCount: 0,
          ambiguityCount: 0,
          repartitionEpoch: (splitCandidate.repartitionEpoch ?? 0) + 1,
          repartitionCount: splitCandidate.repartitionCount + 1,
          lastRepartitionAt: args.entryTime,
          lastEvaluationAt: args.entryTime,
          lastDeltaDescriptionLength: deltaDescriptionLength,
          lastPosteriorEvidence: posteriorEvidence,
          sampleEntryId: splitCandidate.sampleEntryId,
          sampleKey: splitCandidate.sampleKey,
          sampleTitle: splitCandidate.sampleTitle,
          sampleSummary: splitCandidate.sampleSummary,
          parentChartId: splitCandidate._id,
          lastAssignedAt: args.entryTime,
          createdAt: args.entryTime,
          updatedAt: args.entryTime,
        });

        await ctx.db.patch(splitCandidate._id, {
          centroid: split.statsA.meanDirection,
          variance: [split.statsA.tangentVariance],
          radius: split.statsA.radius,
          meanDirection: split.statsA.meanDirection,
          sumVector: split.statsA.sumVector,
          resultantNorm: split.statsA.resultantNorm,
          tangentVariance: split.statsA.tangentVariance,
          meanGeodesicResidual: split.statsA.meanGeodesicResidual,
          negativeLogLikelihoodSum: split.statsA.negativeLogLikelihoodSum,
          descriptionLength: split.statsA.descriptionLength,
          posteriorEvidence,
          compressionLoss: childAEnvelope.compressionLoss,
          supportCoverageLoss: childAEnvelope.supportCoverageLoss,
          overlapPenalty: childAEnvelope.overlapPenalty,
          coverageEntropy: childAEnvelope.compressionLoss,
          preservedInformation: childAEnvelope.preservedInformation,
          memberCount: split.clusterA.length,
          assignmentCount: split.clusterA.length,
          recentAssignmentCount: split.clusterA.length,
          repartitionEpoch: (splitCandidate.repartitionEpoch ?? 0) + 1,
          repartitionCount: splitCandidate.repartitionCount + 1,
          lastRepartitionAt: args.entryTime,
          lastEvaluationAt: args.entryTime,
          lastDeltaDescriptionLength: deltaDescriptionLength,
          lastPosteriorEvidence: posteriorEvidence,
          updatedAt: args.entryTime,
        });

        const splitCharts = [
          {
            chartId: String(splitCandidate._id),
            meanDirection: split.statsA.meanDirection,
            tangentVariance: split.statsA.tangentVariance,
          },
          {
            chartId: String(newChartId),
            meanDirection: split.statsB.meanDirection,
            tangentVariance: split.statsB.tangentVariance,
          },
        ];
        for (const member of members) {
          const envelope = softAssignments(member.embedding, splitCharts);
          const target =
            envelope.best?.chartId === String(newChartId)
              ? newChartId
              : splitCandidate._id;
          await ctx.db.patch(member._id, {
            chartId: target,
            geodesicResidual: envelope.best?.geodesicResidual ?? 0,
            localNegativeLogLikelihood:
              envelope.best?.localNegativeLogLikelihood ?? 0,
            posteriorProbability: envelope.best?.posteriorProbability ?? 1,
            assignmentEntropy: envelope.coverageEntropy,
            supportCoverageLoss: envelope.supportCoverageLoss,
            preservedInformation: envelope.preservedInformation,
            mahalanobisDistance: envelope.best?.geodesicResidual ?? 0,
            ambiguityScore:
              (envelope.second?.posteriorProbability ?? 0) > 0.15
                ? envelope.coverageEntropy
                : undefined,
            boundaryScore: envelope.second?.posteriorProbability ?? undefined,
            repartitionEpoch: (splitCandidate.repartitionEpoch ?? 0) + 1,
            updatedAt: args.entryTime,
          });
        }

        await recordMemoryChartRepartitionEvent(ctx, {
          namespace: args.namespace,
          kind: "split",
          accepted: true,
          targetChartIds: [String(splitCandidate._id)],
          resultChartIds: [String(splitCandidate._id), String(newChartId)],
          deltaDescriptionLength,
          posteriorEvidence,
          compressionDelta:
            childAEnvelope.compressionLoss +
            childBEnvelope.compressionLoss -
            splitCandidate.compressionLoss,
          supportCoverageDelta:
            childAEnvelope.supportCoverageLoss +
            childBEnvelope.supportCoverageLoss -
            splitCandidate.supportCoverageLoss,
          overlapDelta:
            childAEnvelope.overlapPenalty +
            childBEnvelope.overlapPenalty -
            splitCandidate.overlapPenalty,
          details: {
            targetMembers: members.length,
          },
          entryTime: args.entryTime,
        });

        const namespaceState = await syncMemoryChartNamespaceMetrics(
          ctx,
          args.namespace,
        );
        if (!namespaceState) {
          return emptyMaintenanceResult();
        }

        await ctx.db.patch(namespaceState._id, {
          repartitionCount: namespaceState.repartitionCount + 1,
          splitCount: namespaceState.splitCount + 1,
          updatedAt: args.entryTime,
        });
        return {
          accepted: true,
          kind: "split" as const,
          createdChartIds: [String(newChartId)],
          deletedChartIds: [] as string[],
        };
      }

      await recordMemoryChartRepartitionEvent(ctx, {
        namespace: args.namespace,
        kind: "evaluate",
        accepted: false,
        targetChartIds: [String(splitCandidate._id)],
        resultChartIds: [String(splitCandidate._id)],
        deltaDescriptionLength,
        posteriorEvidence,
        compressionDelta:
          childAEnvelope.compressionLoss +
          childBEnvelope.compressionLoss -
          splitCandidate.compressionLoss,
        supportCoverageDelta:
          childAEnvelope.supportCoverageLoss +
          childBEnvelope.supportCoverageLoss -
          splitCandidate.supportCoverageLoss,
        overlapDelta:
          childAEnvelope.overlapPenalty +
          childBEnvelope.overlapPenalty -
          splitCandidate.overlapPenalty,
        details: {
          reason: "split-not-supported",
        },
        entryTime: args.entryTime,
      });
    }
  }

  const supportEdges = await ctx.db
    .query("memoryChartSupportEdges")
    .withIndex("by_namespace_updatedAt", (q) => q.eq("namespace", args.namespace))
    .collect();
  const mergeCandidate = supportEdges.sort(
    (left: MemoryChartSupportEdgeDoc, right: MemoryChartSupportEdgeDoc) =>
      right.overlapMass - left.overlapMass,
  )[0];

  if (mergeCandidate) {
    const fromChart = await ctx.db.get(mergeCandidate.fromChartId);
    const toChart = await ctx.db.get(mergeCandidate.toChartId);
    if (fromChart && toChart) {
      const fromMembers = await ctx.db
        .query("memoryChartMembers")
        .withIndex("by_chart_assignedAt", (q) => q.eq("chartId", fromChart._id))
        .collect();
      const toMembers = await ctx.db
        .query("memoryChartMembers")
        .withIndex("by_chart_assignedAt", (q) => q.eq("chartId", toChart._id))
        .collect();
      const allPoints = [
        ...fromMembers.map((member) => member.embedding),
        ...toMembers.map((member) => member.embedding),
      ];
      const merged = buildChartStatistics(allPoints);
      const currentObjective = chartObjective(fromChart) + chartObjective(toChart);
      const mergedObjective = merged.descriptionLength;
      const deltaDescriptionLength =
        merged.descriptionLength -
        (fromChart.descriptionLength + toChart.descriptionLength);
      const posteriorEvidence = currentObjective - mergedObjective;
      if (posteriorEvidence > 0) {
        await ctx.db.patch(fromChart._id, {
          centroid: merged.meanDirection,
          variance: [merged.tangentVariance],
          radius: merged.radius,
          meanDirection: merged.meanDirection,
          sumVector: merged.sumVector,
          resultantNorm: merged.resultantNorm,
          tangentVariance: merged.tangentVariance,
          meanGeodesicResidual: merged.meanGeodesicResidual,
          negativeLogLikelihoodSum: merged.negativeLogLikelihoodSum,
          descriptionLength: merged.descriptionLength,
          posteriorEvidence,
          compressionLoss: 0,
          supportCoverageLoss: 0,
          overlapPenalty: 0,
          coverageEntropy: 0,
          preservedInformation: allPoints.length,
          memberCount: allPoints.length,
          assignmentCount:
            (fromChart.assignmentCount ?? fromChart.memberCount) +
            (toChart.assignmentCount ?? toChart.memberCount),
          recentAssignmentCount: allPoints.length,
          repartitionEpoch:
            Math.max(fromChart.repartitionEpoch ?? 0, toChart.repartitionEpoch ?? 0) +
            1,
          repartitionCount:
            Math.max(fromChart.repartitionCount, toChart.repartitionCount) + 1,
          lastRepartitionAt: args.entryTime,
          lastEvaluationAt: args.entryTime,
          lastDeltaDescriptionLength: deltaDescriptionLength,
          lastPosteriorEvidence: posteriorEvidence,
          updatedAt: args.entryTime,
        });

        for (const member of toMembers) {
          const metrics = sphericalPointMetrics(member.embedding, {
            meanDirection: merged.meanDirection,
            tangentVariance: merged.tangentVariance,
          });
          await ctx.db.patch(member._id, {
            chartId: fromChart._id,
            geodesicResidual: metrics.geodesicResidual,
            localNegativeLogLikelihood: metrics.localNegativeLogLikelihood,
            posteriorProbability: 1,
            assignmentEntropy: 0,
            supportCoverageLoss: 0,
            preservedInformation: 1,
            mahalanobisDistance: metrics.geodesicResidual,
            ambiguityScore: undefined,
            boundaryScore: undefined,
            repartitionEpoch:
              Math.max(
                fromChart.repartitionEpoch ?? 0,
                toChart.repartitionEpoch ?? 0,
              ) + 1,
            updatedAt: args.entryTime,
          });
        }

        await deleteSupportEdgesForChart(ctx, args.namespace, toChart._id);
        await ctx.db.delete(toChart._id);
        await recordMemoryChartRepartitionEvent(ctx, {
          namespace: args.namespace,
          kind: "merge",
          accepted: true,
          targetChartIds: [String(fromChart._id), String(toChart._id)],
          resultChartIds: [String(fromChart._id)],
          deltaDescriptionLength,
          posteriorEvidence,
          compressionDelta: 0 - (fromChart.compressionLoss + toChart.compressionLoss),
          supportCoverageDelta:
            0 - (fromChart.supportCoverageLoss + toChart.supportCoverageLoss),
          overlapDelta: 0 - (fromChart.overlapPenalty + toChart.overlapPenalty),
          details: {
            supportEdge: mergeCandidate.overlapMass,
          },
          entryTime: args.entryTime,
        });

        const namespaceState = await syncMemoryChartNamespaceMetrics(
          ctx,
          args.namespace,
        );
        if (!namespaceState) {
          return emptyMaintenanceResult();
        }

        await ctx.db.patch(namespaceState._id, {
          repartitionCount: namespaceState.repartitionCount + 1,
          mergeCount: namespaceState.mergeCount + 1,
          updatedAt: args.entryTime,
        });
        return {
          accepted: true,
          kind: "merge" as const,
          createdChartIds: [] as string[],
          deletedChartIds: [String(toChart._id)],
        };
      }
    }
  }

  await syncMemoryChartNamespaceMetrics(ctx, args.namespace);
  return emptyMaintenanceResult();
}
