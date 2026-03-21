const EPSILON = 1e-6;
const TWO_PI = Math.PI * 2;
const PRIOR_TANGENT_VARIANCE = 0.2;

export type SphericalChartModel = {
  chartId?: string;
  meanDirection: number[];
  tangentVariance: number;
  assignmentCount?: number;
};

export type ChartPointMetrics = {
  cosineSimilarity: number;
  geodesicResidual: number;
  localNegativeLogLikelihood: number;
};

export type SoftAssignment = {
  chartId?: string;
  score: number;
  posteriorProbability: number;
  geodesicResidual: number;
  localNegativeLogLikelihood: number;
};

export type AssignmentEnvelope = {
  best: SoftAssignment | null;
  second: SoftAssignment | null;
  assignments: SoftAssignment[];
  supportCoverageLoss: number;
  overlapPenalty: number;
  coverageEntropy: number;
  preservedInformation: number;
  compressionLoss: number;
};

export type ChartSufficientStatistics = {
  meanDirection: number[];
  sumVector: number[];
  resultantNorm: number;
  tangentVariance: number;
  meanGeodesicResidual: number;
  negativeLogLikelihoodSum: number;
  descriptionLength: number;
  radius: number;
};

export function dotProduct(left: number[], right: number[]) {
  let total = 0;
  const dims = Math.min(left.length, right.length);
  for (let index = 0; index < dims; index += 1) {
    total += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return total;
}

export function vectorNorm(values: number[]) {
  return Math.sqrt(dotProduct(values, values));
}

export function normalizeEmbedding(values: number[]) {
  const norm = Math.max(vectorNorm(values), EPSILON);
  return values.map((value) => value / norm);
}

export function sphericalPointMetrics(
  point: number[],
  chart: SphericalChartModel,
): ChartPointMetrics {
  const cosineSimilarity = Math.max(
    -1,
    Math.min(1, dotProduct(point, chart.meanDirection)),
  );
  const geodesicResidual = Math.acos(cosineSimilarity);
  const assignmentCount = Math.max(chart.assignmentCount ?? 0, 0);
  const tangentVariance = Math.max(
    (Math.max(chart.tangentVariance, EPSILON) * assignmentCount +
      PRIOR_TANGENT_VARIANCE) /
      (assignmentCount + 1),
    EPSILON,
  );
  const localNegativeLogLikelihood =
    0.5 *
    (Math.log(TWO_PI * tangentVariance) +
      (geodesicResidual * geodesicResidual) / tangentVariance);
  return {
    cosineSimilarity,
    geodesicResidual,
    localNegativeLogLikelihood,
  };
}

export function softAssignments(
  point: number[],
  charts: SphericalChartModel[],
): AssignmentEnvelope {
  if (charts.length === 0) {
    return {
      best: null,
      second: null,
      assignments: [],
      supportCoverageLoss: 0,
      overlapPenalty: 0,
      coverageEntropy: 0,
      preservedInformation: 1,
      compressionLoss: 0,
    };
  }

  const scored = charts.map((chart) => {
    const metrics = sphericalPointMetrics(point, chart);
    return {
      chartId: chart.chartId,
      score: -metrics.localNegativeLogLikelihood,
      posteriorProbability: 0,
      geodesicResidual: metrics.geodesicResidual,
      localNegativeLogLikelihood: metrics.localNegativeLogLikelihood,
    };
  });

  let maxScore = Number.NEGATIVE_INFINITY;
  for (const item of scored) {
    maxScore = Math.max(maxScore, item.score);
  }

  let partition = 0;
  for (const item of scored) {
    partition += Math.exp(item.score - maxScore);
  }

  for (const item of scored) {
    item.posteriorProbability = Math.exp(item.score - maxScore) / partition;
  }

  scored.sort(
    (left, right) => right.posteriorProbability - left.posteriorProbability,
  );

  let coverageEntropy = 0;
  for (const item of scored) {
    if (item.posteriorProbability <= 0) {
      continue;
    }
    coverageEntropy -=
      item.posteriorProbability * Math.log(item.posteriorProbability);
  }

  const maxEntropy = Math.log(Math.max(scored.length, 2));
  const normalizedEntropy = maxEntropy > 0 ? coverageEntropy / maxEntropy : 0;
  const best = scored[0] ?? null;
  const second = scored[1] ?? null;
  const supportCoverageLoss = 1 - (best?.posteriorProbability ?? 1);
  const overlapPenalty = second?.posteriorProbability ?? 0;

  return {
    best,
    second,
    assignments: scored,
    supportCoverageLoss,
    overlapPenalty,
    coverageEntropy,
    preservedInformation: 1 - normalizedEntropy,
    compressionLoss: normalizedEntropy,
  };
}

export function chartComplexityPenalty(memberCount: number, chartCount = 1) {
  return 0.5 * chartCount * Math.log(Math.max(memberCount + 1, 2));
}

export function chartDescriptionLength(
  negativeLogLikelihoodSum: number,
  memberCount: number,
  chartCount = 1,
) {
  return (
    negativeLogLikelihoodSum + chartComplexityPenalty(memberCount, chartCount)
  );
}

export function buildChartStatistics(
  points: number[][],
): ChartSufficientStatistics {
  if (points.length === 0) {
    return {
      meanDirection: [],
      sumVector: [],
      resultantNorm: 0,
      tangentVariance: 1,
      meanGeodesicResidual: 0,
      negativeLogLikelihoodSum: 0,
      descriptionLength: 0,
      radius: 0,
    };
  }

  const dims = points[0]?.length ?? 0;
  const sumVector = Array.from({ length: dims }, () => 0);
  for (const point of points) {
    for (let index = 0; index < dims; index += 1) {
      sumVector[index] = (sumVector[index] ?? 0) + (point[index] ?? 0);
    }
  }

  const meanDirection = normalizeEmbedding(sumVector);
  const resultantNorm = vectorNorm(sumVector);

  let distortionSum = 0;
  const residuals: number[] = [];
  for (const point of points) {
    const metrics = sphericalPointMetrics(point, {
      meanDirection,
      tangentVariance: 1,
    });
    const squaredResidual = metrics.geodesicResidual * metrics.geodesicResidual;
    distortionSum += squaredResidual;
    residuals.push(metrics.geodesicResidual);
  }

  const tangentVariance = Math.max(
    (distortionSum + PRIOR_TANGENT_VARIANCE) / (points.length + 1),
    EPSILON,
  );
  let negativeLogLikelihoodSum = 0;
  for (const point of points) {
    negativeLogLikelihoodSum += sphericalPointMetrics(point, {
      meanDirection,
      tangentVariance,
    }).localNegativeLogLikelihood;
  }

  const meanGeodesicResidual =
    residuals.reduce((total, value) => total + value, 0) / points.length;
  const sortedResiduals = [...residuals].sort((left, right) => left - right);
  const radius =
    sortedResiduals[
      Math.max(0, Math.floor(sortedResiduals.length * 0.8) - 1)
    ] ?? meanGeodesicResidual;

  return {
    meanDirection,
    sumVector,
    resultantNorm,
    tangentVariance,
    meanGeodesicResidual,
    negativeLogLikelihoodSum,
    descriptionLength: chartDescriptionLength(
      negativeLogLikelihoodSum,
      points.length,
    ),
    radius,
  };
}

export function farthestPointSplit(points: number[][]) {
  if (points.length < 2) {
    return null;
  }

  let seedA = 0;
  let seedB = 1;
  let maxResidual = Number.NEGATIVE_INFINITY;
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const similarity = Math.max(
        -1,
        Math.min(1, dotProduct(points[left] ?? [], points[right] ?? [])),
      );
      const residual = Math.acos(similarity);
      if (residual > maxResidual) {
        maxResidual = residual;
        seedA = left;
        seedB = right;
      }
    }
  }

  let clusterA = [points[seedA] ?? []];
  let clusterB = [points[seedB] ?? []];

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const chartA = buildChartStatistics(clusterA);
    const chartB = buildChartStatistics(clusterB);
    clusterA = [];
    clusterB = [];
    for (const point of points) {
      const scoreA = sphericalPointMetrics(point, {
        meanDirection: chartA.meanDirection,
        tangentVariance: chartA.tangentVariance,
      }).localNegativeLogLikelihood;
      const scoreB = sphericalPointMetrics(point, {
        meanDirection: chartB.meanDirection,
        tangentVariance: chartB.tangentVariance,
      }).localNegativeLogLikelihood;
      if (scoreA <= scoreB) {
        clusterA.push(point);
      } else {
        clusterB.push(point);
      }
    }
    if (clusterA.length === 0 || clusterB.length === 0) {
      return null;
    }
  }

  return {
    clusterA,
    clusterB,
    statsA: buildChartStatistics(clusterA),
    statsB: buildChartStatistics(clusterB),
  };
}
