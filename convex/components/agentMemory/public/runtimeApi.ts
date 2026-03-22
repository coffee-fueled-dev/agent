import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  appendRuntimeHistoryArgs,
  appendRuntimeHistoryImpl,
  applyRuntimeFactsArgs,
  applyRuntimeFactsImpl,
  completeRuntimeCommitArgs,
  completeRuntimeCommitImpl,
  getRuntimeRegistrationArgs,
  getRuntimeRegistrationImpl,
  startRuntimeCommitArgs,
  startRuntimeCommitImpl,
} from "./runtime/agentRuntime";
import {
  getMemoryEntryIdsForChartsImpl,
  getMemoryChartImpl,
  getMemoryChartNamespaceMetricsImpl,
  listMemoryChartMembersImpl,
  listMemoryChartRepartitionEventsImpl,
  listMemoryChartSupportEdgesImpl,
  listMemoryChartsImpl,
} from "./runtime/memoryChartQueries";
import {
  completeMemoryChartMaintenanceImpl,
  maintainMemoryChartNamespaceImpl,
  markMemoryChartMaintenanceQueuedImpl,
  memoryChartMaintenanceArgs,
  memoryChartUpdateValidator,
  upsertMemoryChartAssignmentImpl,
} from "./runtime/memoryChartMutations";

export const getRuntimeRegistration = query({
  args: getRuntimeRegistrationArgs,
  handler: getRuntimeRegistrationImpl,
});

export const startRuntimeCommit = mutation({
  args: startRuntimeCommitArgs,
  handler: startRuntimeCommitImpl,
});

export const appendRuntimeHistory = mutation({
  args: appendRuntimeHistoryArgs,
  handler: appendRuntimeHistoryImpl,
});

export const applyRuntimeFacts = mutation({
  args: applyRuntimeFactsArgs,
  handler: applyRuntimeFactsImpl,
});

export const completeRuntimeCommit = mutation({
  args: completeRuntimeCommitArgs,
  handler: completeRuntimeCommitImpl,
});

export const upsertMemoryChartAssignment = mutation({
  args: memoryChartUpdateValidator,
  handler: upsertMemoryChartAssignmentImpl,
});

export const markMemoryChartMaintenanceQueued = mutation({
  args: memoryChartMaintenanceArgs,
  handler: markMemoryChartMaintenanceQueuedImpl,
});

export const completeMemoryChartMaintenance = mutation({
  args: memoryChartMaintenanceArgs,
  handler: completeMemoryChartMaintenanceImpl,
});

export const maintainMemoryChartNamespace = mutation({
  args: memoryChartMaintenanceArgs,
  handler: maintainMemoryChartNamespaceImpl,
});

export const listMemoryCharts = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: listMemoryChartsImpl,
});

export const getMemoryChart = query({
  args: {
    chartId: v.id("memoryCharts"),
  },
  handler: getMemoryChartImpl,
});

export const getMemoryChartNamespaceMetrics = query({
  args: {
    namespace: v.string(),
  },
  handler: getMemoryChartNamespaceMetricsImpl,
});

export const getMemoryEntryIdsForCharts = query({
  args: {
    namespace: v.string(),
    chartIds: v.array(v.id("memoryCharts")),
  },
  handler: getMemoryEntryIdsForChartsImpl,
});

export const listMemoryChartMembers = query({
  args: {
    chartId: v.id("memoryCharts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: listMemoryChartMembersImpl,
});

export const listMemoryChartSupportEdges = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: listMemoryChartSupportEdgesImpl,
});

export const listMemoryChartRepartitionEvents = query({
  args: {
    namespace: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: listMemoryChartRepartitionEventsImpl,
});
