import { v } from "convex/values";
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

export type RuntimeRegistrationArgs = {
  runtime: string;
  description?: string;
  historyStreamType: string;
  facts: {
    entities: Array<{
      entityType: string;
      states: string[];
      attrs: Record<string, "string" | "number" | "boolean">;
    }>;
    edgeKinds: string[];
    partitions: string[];
  };
  namespaces?: {
    facts?: string;
    current?: string;
    historical?: string;
  };
  searchProfiles?: {
    current?: { sourceKinds?: string[] };
    historical?: { sourceKinds?: string[] };
  };
};

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

export type RuntimeEpisodeCommitArgs = {
  runtime: string;
  streamId: string;
  commitKey: string;
  workId?: string;
  entryTime?: number;
  latestEntity?: string;
  history: {
    entryId: string;
    kind: string;
    parentEntryIds?: string[];
    payload?: unknown;
  };
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
  current?: RuntimeMemoryEntry;
  historical?: RuntimeMemoryEntry;
};

export type RuntimeMemoryEntry = {
  key: string;
  title?: string;
  text: string;
  sourceKind?: string;
  entity?: string;
  entityType?: string;
  scope?: string;
  validFrom?: number;
  validTo?: number | null;
  metadata?: AgentMemoryMetadataRecord;
};

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
