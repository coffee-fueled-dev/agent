import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { AgentMemoryMetadataRecord } from "./shared";

const attrTypeValidator = v.union(
  v.literal("string"),
  v.literal("number"),
  v.literal("boolean"),
);

export const factEntityValidator = v.object({
  entityType: v.string(),
  states: v.array(v.string()),
  attrs: v.record(v.string(), attrTypeValidator),
});

export const runtimeRegistrationValidator = v.object({
  runtime: v.string(),
  description: v.optional(v.string()),
  historyStreamType: v.string(),
  facts: v.object({
    entities: v.array(factEntityValidator),
    edgeKinds: v.array(v.string()),
    partitions: v.array(v.string()),
  }),
  namespaces: v.optional(
    v.object({
      facts: v.optional(v.string()),
      current: v.optional(v.string()),
      historical: v.optional(v.string()),
    }),
  ),
  searchProfiles: v.optional(
    v.object({
      current: v.optional(
        v.object({
          sourceKinds: v.optional(v.array(v.string())),
        }),
      ),
      historical: v.optional(
        v.object({
          sourceKinds: v.optional(v.array(v.string())),
        }),
      ),
    }),
  ),
});

export type RuntimeRegistrationArgs = Infer<
  typeof runtimeRegistrationValidator
>;

export const factAttrsValidator = v.optional(
  v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
);

export const factItemValidator = v.object({
  entity: v.string(),
  entityType: v.string(),
  scope: v.optional(v.string()),
  state: v.optional(v.string()),
  order: v.array(v.number()),
  labels: v.optional(v.array(v.string())),
  attrs: factAttrsValidator,
});

export const factEdgeValidator = v.object({
  kind: v.string(),
  from: v.string(),
  to: v.string(),
  scope: v.optional(v.string()),
});

export const factPartitionValidator = v.object({
  partition: v.string(),
  scope: v.optional(v.string()),
  head: v.optional(v.string()),
  tail: v.optional(v.string()),
  count: v.number(),
  membersVersion: v.optional(v.number()),
});

export const runtimeMemoryEntryValidator = v.object({
  key: v.string(),
  title: v.optional(v.string()),
  text: v.string(),
  sourceKind: v.optional(v.string()),
  entity: v.optional(v.string()),
  entityType: v.optional(v.string()),
  scope: v.optional(v.string()),
  validFrom: v.optional(v.number()),
  validTo: v.optional(v.union(v.number(), v.null())),
  metadata: v.optional(
    v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null()),
    ),
  ),
});

export const runtimeEpisodeCommitValidator = v.object({
  runtime: v.string(),
  streamId: v.string(),
  commitKey: v.string(),
  workId: v.optional(v.string()),
  entryTime: v.optional(v.number()),
  latestEntity: v.optional(v.string()),
  history: v.object({
    entryId: v.string(),
    kind: v.string(),
    parentEntryIds: v.optional(v.array(v.string())),
    payload: v.optional(v.any()),
  }),
  facts: v.object({
    items: v.array(factItemValidator),
    edges: v.optional(v.array(factEdgeValidator)),
    partitions: v.optional(v.array(factPartitionValidator)),
    projector: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("direct"), v.literal("event"))),
  }),
  current: v.optional(runtimeMemoryEntryValidator),
  historical: v.optional(runtimeMemoryEntryValidator),
});

export type RuntimeEpisodeCommitArgs = Infer<
  typeof runtimeEpisodeCommitValidator
>;

export type RuntimeMemoryEntry = Infer<typeof runtimeMemoryEntryValidator>;

export type RuntimeSearchArgs = {
  runtime: string;
  streamId: string;
  query: string | number[];
  filters?: unknown[];
  limit?: number;
  chunkContext?: {
    before: number;
    after: number;
  };
  vectorScoreThreshold?: number;
  searchType?: "vector" | "text" | "hybrid";
  textWeight?: number;
  vectorWeight?: number;
  asOfTime?: number;
  includeHistorical?: boolean;
  sourceKinds?: string[];
  entity?: string;
  entityType?: string;
};

export const runtimeSearchArgsValidator = {
  runtime: v.string(),
  streamId: v.string(),
};

export type RuntimeRegistrationDoc = Doc<"runtimeRegistrations">;
export type RuntimeStreamDoc = Doc<"runtimeStreams">;
export type RuntimeCommitDoc = Doc<"runtimeCommitLog">;

export type RuntimeStreamState = {
  runtime: string;
  streamId: string;
  factsNamespace: string;
  currentNamespace: string;
  historicalNamespace: string;
  latestVersion: number;
  latestEntryId: string | null;
  latestEntryTime: number | null;
  latestEntity: string | null;
  lastCommitKey: string | null;
  lastWorkId: string | null;
};

export const memoryChartSourceTypeValidator = v.union(
  v.literal("text"),
  v.literal("textFile"),
  v.literal("binaryFile"),
);

export const memoryChartUpdateValidator = v.object({
  namespace: v.string(),
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  summary: v.string(),
  sourceType: memoryChartSourceTypeValidator,
  sourceKind: v.optional(v.string()),
  storageId: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  fileName: v.optional(v.union(v.string(), v.null())),
  metadata: v.optional(
    v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null()),
    ),
  ),
  entryTime: v.number(),
  embedding: v.array(v.number()),
});

export type MemoryChartSourceType = Infer<
  typeof memoryChartSourceTypeValidator
>;

export type MemoryChartUpdateArgs = Infer<typeof memoryChartUpdateValidator>;

export type MemoryChartSummary = {
  chartId: string;
  namespace: string;
  chartKey: string;
  memberCount: number;
  assignmentCount: number;
  boundaryCount: number;
  ambiguityCount: number;
  radius: number;
  centroidNorm: number;
  meanVariance: number;
  tangentVariance: number;
  meanGeodesicResidual: number;
  negativeLogLikelihoodSum: number;
  descriptionLength: number;
  posteriorEvidence: number;
  compressionLoss: number;
  supportCoverageLoss: number;
  overlapPenalty: number;
  coverageEntropy: number;
  preservedInformation: number;
  repartitionEpoch: number;
  repartitionCount: number;
  lastRepartitionAt: number | null;
  lastEvaluationAt: number | null;
  lastDeltaDescriptionLength: number | null;
  lastPosteriorEvidence: number | null;
  sampleKey: string | null;
  sampleTitle: string | null;
  sampleSummary: string | null;
  lastAssignedAt: number;
  createdAt: number;
  updatedAt: number;
};

export type MemoryChartMember = {
  chartMemberId: string;
  chartId: string;
  namespace: string;
  entryId: string;
  key: string;
  title: string | null;
  summary: string;
  sourceType: MemoryChartSourceType;
  sourceKind: string | null;
  storageId: string | null;
  mimeType: string | null;
  fileName: string | null;
  metadata: AgentMemoryMetadataRecord;
  embedding: number[];
  geodesicResidual: number;
  localNegativeLogLikelihood: number;
  posteriorProbability: number;
  assignmentEntropy: number;
  supportCoverageLoss: number;
  preservedInformation: number;
  mahalanobisDistance: number;
  ambiguityScore: number | null;
  boundaryScore: number | null;
  repartitionEpoch: number;
  assignedAt: number;
};

export type MemoryChartMetrics = {
  chartCount: number;
  memberCount: number;
  boundaryCount: number;
  ambiguityCount: number;
  negativeLogLikelihoodSum: number;
  descriptionLength: number;
  compressionLoss: number;
  supportCoverageLoss: number;
  overlapPenalty: number;
  coverageEntropy: number;
  preservedInformation: number;
  repartitionCount: number;
  splitCount: number;
  mergeCount: number;
  pendingMaintenanceCount: number;
};

export type MemoryChartSupportEdge = {
  edgeId: string;
  namespace: string;
  chartPairKey: string;
  fromChartId: string;
  toChartId: string;
  supportCount: number;
  overlapMass: number;
  coverageEntropySum: number;
  updatedAt: number;
};

export type MemoryChartRepartitionEvent = {
  eventId: string;
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
  details: AgentMemoryMetadataRecord;
  entryTime: number;
};

export type RuntimeCurrentView = RuntimeStreamState & {
  latestFact: {
    entity: string;
    entityType: string;
    scope?: string;
    state?: string;
    order: number[];
    labels: string[];
    attrs?: Record<string, unknown>;
  } | null;
};

export type RuntimeEvolutionView = RuntimeStreamState & {
  facts: Array<{
    entity: string;
    entityType: string;
    scope?: string;
    state?: string;
    order: number[];
    labels: string[];
    attrs?: Record<string, unknown>;
  }>;
  history: Array<{
    entryId: string;
    kind: string;
    entryTime: number;
    parentEntryIds: string[];
    payload?: unknown;
  }>;
};

export function namespaceSuffix(
  registration: RuntimeRegistrationDoc,
  kind: "facts" | "current" | "historical",
) {
  switch (kind) {
    case "facts":
      return registration.factsNamespaceSuffix;
    case "current":
      return registration.currentNamespaceSuffix;
    case "historical":
      return registration.historicalNamespaceSuffix;
  }
}

export function runtimeNamespace(
  registration: RuntimeRegistrationDoc,
  streamId: string,
  kind: "facts" | "current" | "historical",
) {
  return `${registration.runtime}:${streamId}:${namespaceSuffix(registration, kind)}`;
}

export function normalizeRuntimeState(args: {
  runtime: string;
  streamId: string;
  factsNamespace: string;
  currentNamespace: string;
  historicalNamespace: string;
  latestVersion?: number;
  latestEntryId?: string;
  latestEntryTime?: number;
  latestEntity?: string;
  lastCommitKey?: string;
  lastWorkId?: string;
}): RuntimeStreamState {
  return {
    runtime: args.runtime,
    streamId: args.streamId,
    factsNamespace: args.factsNamespace,
    currentNamespace: args.currentNamespace,
    historicalNamespace: args.historicalNamespace,
    latestVersion: args.latestVersion ?? 0,
    latestEntryId: args.latestEntryId ?? null,
    latestEntryTime: args.latestEntryTime ?? null,
    latestEntity: args.latestEntity ?? null,
    lastCommitKey: args.lastCommitKey ?? null,
    lastWorkId: args.lastWorkId ?? null,
  };
}
