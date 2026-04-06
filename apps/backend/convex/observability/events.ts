import { EventsClient } from "@very-coffee/convex-events";
import { createEventBus } from "@very-coffee/convex-events/eventBus";
import type { EventsConfig } from "@very-coffee/convex-events/types";
import { v } from "convex/values";
import { components } from "../_generated/api.js";

/**
 * `streamId` for the `memory` observability stream (namespace = `userId`).
 * Memory events are not thread-scoped. For `listStreamEvents` with `name: "memory"`, omit `streamId`
 * or pass this constant.
 */
export const MEMORY_OBSERVABILITY_STREAM_ID = "default";

const correlationFields = {
  threadId: v.string(),
  messageId: v.string(),
  sessionId: v.string(),
  namespace: v.string(),
  agentId: v.optional(v.string()),
};

/** Matches {@link FingerprintClientEvent} — `appendFingerprint` passes this as the inner `payload`. */
const fingerprintRecordPayload = v.object({
  event: v.union(
    v.literal("registerAgent"),
    v.literal("registerTool"),
    v.literal("registerAgentAndTools"),
    v.literal("recordEvaluation"),
    v.literal("recordEvaluationForRegisteredAgent"),
  ),
  args: v.any(),
  result: v.any(),
});

/** Inner shape from {@link MemoryClientEvent} for `mergeMemory` notifications. */
const memoryMergeObservation = v.object({
  event: v.literal("mergeMemory"),
  args: v.any(),
  result: v.object({
    memoryRecordId: v.string(),
    workId: v.string(),
  }),
});

/** Inner shape for `searchMemory` — `result` is RRF-fused rows from `searchMemory` (not per-arm lexical/vector). */
const memorySearchObservation = v.object({
  event: v.literal("searchMemory"),
  args: v.any(),
  result: v.any(),
});

const memoryRegisterStorageObservation = v.object({
  event: v.literal("registerStorageSourceMetadata"),
  args: v.any(),
  result: v.null(),
});

export const eventsConfig = {
  streams: [
    {
      name: "toolPipeline",
      events: {
        toolExecuted: {
          ...correlationFields,
          ok: v.boolean(),
          toolName: v.string(),
          input: v.any(),
          output: v.optional(v.any()),
          error: v.optional(v.string()),
          durationMs: v.optional(v.number()),
        },
        policyEvaluated: {
          ...correlationFields,
          ok: v.boolean(),
          policyId: v.string(),
          phase: v.union(
            v.literal("toolkit"),
            v.literal("tool"),
            v.literal("dynamicToolkit"),
          ),
          toolName: v.optional(v.string()),
          composableName: v.optional(v.string()),
          error: v.optional(v.string()),
        },
      },
    },
    {
      name: "fingerprints",
      events: {
        record: {
          payload: fingerprintRecordPayload,
        },
      },
    },
    {
      name: "memory",
      events: {
        mergeMemory: { payload: memoryMergeObservation },
        searchMemory: { payload: memorySearchObservation },
        registerStorageSourceMetadata: {
          payload: memoryRegisterStorageObservation,
        },
      },
    },
  ],
} as const satisfies EventsConfig;

export const events = new EventsClient(components.events, eventsConfig);

const { listener, tables } = createEventBus({
  sources: [{ client: events, key: "main" }],
  eviction: {
    type: "fifo",
    rules: [{ match: {}, groupBy: ["namespace"], size: 500 }],
  },
});
export const bus = listener;
export const busTables = tables;
