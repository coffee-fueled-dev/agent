import type { WorkflowCtx } from "@convex-dev/workflow";
import { type Infer, v } from "convex/values";
import { UMAP } from "umap-js";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction, query } from "../_generated/server";
import type {
  MemoryChartMember,
  MemoryChartSummary,
} from "../components/agentMemory/internal/runtime";
import { workflow as workflowManager } from "../workflow";

const DEFAULT_PROJECTION_LIMIT = 120;
const MAX_PROJECTION_LIMIT = 300;
const CHART_PAGE_SIZE = 32;
const MEMBER_PAGE_SIZE = 48;

const projectionSeedValidator = v.object({
  entryId: v.string(),
  chartId: v.string(),
  chartKey: v.string(),
  key: v.string(),
  title: v.union(v.string(), v.null()),
  sourceType: v.union(
    v.literal("text"),
    v.literal("textFile"),
    v.literal("binaryFile"),
  ),
  mimeType: v.optional(v.union(v.string(), v.null())),
  fileUrl: v.optional(v.union(v.string(), v.null())),
  embedding: v.array(v.number()),
});

type ProjectionChart = Pick<MemoryChartSummary, "chartId" | "chartKey">;
type ProjectionWorkflowStep = Pick<WorkflowCtx, "runQuery">;
type ProjectionSeed = Infer<typeof projectionSeedValidator>;
type ProjectionPoint = Omit<ProjectionSeed, "embedding"> & {
  x: number;
  y: number;
  z: number;
};

function clampProjectionLimit(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_PROJECTION_LIMIT;
  }
  return Math.max(12, Math.min(MAX_PROJECTION_LIMIT, Math.floor(value)));
}

function normalizeChartIds(chartIds?: string[]) {
  return Array.from(
    new Set(
      (chartIds ?? [])
        .map((chartId) => chartId.trim())
        .filter((chartId) => chartId.length > 0),
    ),
  );
}

function normalizeCoordinates(points: number[][]) {
  if (points.length === 0) {
    return [];
  }
  const mins: [number, number, number] = [Infinity, Infinity, Infinity];
  const maxs: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = point[axis] ?? 0;
      if (axis === 0) {
        mins[0] = Math.min(mins[0], value);
        maxs[0] = Math.max(maxs[0], value);
      } else if (axis === 1) {
        mins[1] = Math.min(mins[1], value);
        maxs[1] = Math.max(maxs[1], value);
      } else {
        mins[2] = Math.min(mins[2], value);
        maxs[2] = Math.max(maxs[2], value);
      }
    }
  }
  const centers: [number, number, number] = [
    (mins[0] + maxs[0]) / 2,
    (mins[1] + maxs[1]) / 2,
    (mins[2] + maxs[2]) / 2,
  ];
  const spans: [number, number, number] = [
    maxs[0] - mins[0],
    maxs[1] - mins[1],
    maxs[2] - mins[2],
  ];
  const scale = Math.max(...spans, 1);
  return points.map((point) => [
    ((point[0] ?? 0) - centers[0]) / scale,
    ((point[1] ?? 0) - centers[1]) / scale,
    ((point[2] ?? 0) - centers[2]) / scale,
  ]);
}

function fallbackProjection(vectors: number[][]) {
  return normalizeCoordinates(
    vectors.map((vector, index) => [
      vector[0] ?? 0,
      vector[1] ?? 0,
      vector[2] ?? index / Math.max(vectors.length - 1, 1),
    ]),
  );
}

function projectCoordinates(vectors: number[][]) {
  if (vectors.length === 0) {
    return [];
  }
  if (vectors.length === 1) {
    return [[0, 0, 0]];
  }
  if (vectors.length === 2) {
    return [
      [-0.75, 0, 0],
      [0.75, 0, 0],
    ];
  }
  if (vectors.length === 3) {
    return [
      [-0.7, -0.45, 0],
      [0.7, -0.45, 0],
      [0, 0.8, 0],
    ];
  }
  try {
    const umap = new UMAP({
      nComponents: 3,
      nNeighbors: Math.max(2, Math.min(15, vectors.length - 1)),
      minDist: 0.15,
      spread: 1,
    });
    return normalizeCoordinates(umap.fit(vectors));
  } catch (error) {
    console.error("Falling back from UMAP projection", error);
    return fallbackProjection(vectors);
  }
}

async function getChartsForProjection(
  step: ProjectionWorkflowStep,
  args: {
    namespace: string;
    chartIds: string[];
  },
): Promise<ProjectionChart[]> {
  if (args.chartIds.length > 0) {
    const charts = await Promise.all(
      args.chartIds.map(
        (chartId) =>
          step.runQuery(
            api.agentMemory.getMemoryChart,
            { chartId },
            { inline: true },
          ) as Promise<MemoryChartSummary | null>,
      ),
    );
    return charts
      .filter((chart): chart is MemoryChartSummary => chart !== null)
      .map((chart) => ({ chartId: chart.chartId, chartKey: chart.chartKey }));
  }
  const charts: ProjectionChart[] = [];
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const page = (await step.runQuery(
      api.agentMemory.listMemoryCharts,
      {
        namespace: args.namespace,
        paginationOpts: {
          cursor,
          numItems: CHART_PAGE_SIZE,
        },
      },
      { inline: true },
    )) as {
      page: MemoryChartSummary[];
      isDone: boolean;
      continueCursor: string;
    };
    charts.push(
      ...page.page.map((chart) => ({
        chartId: chart.chartId,
        chartKey: chart.chartKey,
      })),
    );
    cursor = page.continueCursor;
    isDone = page.isDone;
  }
  return charts;
}

async function getProjectionSeeds(
  step: ProjectionWorkflowStep,
  charts: ProjectionChart[],
  limit: number,
): Promise<ProjectionSeed[]> {
  const seeds: ProjectionSeed[] = [];
  for (const chart of charts) {
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone && seeds.length < limit) {
      const pageSize = Math.min(MEMBER_PAGE_SIZE, limit - seeds.length);
      const result = (await step.runQuery(
        api.agentMemory.listMemoryChartMembers,
        {
          chartId: chart.chartId,
          paginationOpts: {
            cursor,
            numItems: pageSize,
          },
        },
        { inline: true },
      )) as {
        page: Array<MemoryChartMember & { fileUrl?: string | null }>;
        isDone: boolean;
        continueCursor: string;
      };
      seeds.push(
        ...result.page.map((member) => ({
          entryId: member.entryId,
          chartId: member.chartId,
          chartKey: chart.chartKey,
          key: member.key,
          title: member.title,
          sourceType: member.sourceType,
          mimeType: member.mimeType ?? null,
          fileUrl: member.fileUrl ?? null,
          embedding: member.embedding,
        })),
      );
      cursor = result.continueCursor;
      isDone = result.isDone;
    }
    if (seeds.length >= limit) {
      break;
    }
  }
  return seeds.slice(0, limit);
}

export const projectEmbeddingCloud = internalAction({
  args: {
    members: v.array(projectionSeedValidator),
  },
  handler: async (_ctx, args): Promise<ProjectionPoint[]> => {
    const coordinates = projectCoordinates(
      args.members.map((member) => member.embedding),
    );
    return args.members.map((member, index) => ({
      entryId: member.entryId,
      chartId: member.chartId,
      chartKey: member.chartKey,
      key: member.key,
      title: member.title,
      sourceType: member.sourceType,
      mimeType: member.mimeType ?? null,
      fileUrl: member.fileUrl ?? null,
      x: coordinates[index]?.[0] ?? 0,
      y: coordinates[index]?.[1] ?? 0,
      z: coordinates[index]?.[2] ?? 0,
    }));
  },
});

export const runMemoryProjectionWorkflow = workflowManager.define({
  args: {
    jobId: v.id("memoryProjectionJobs"),
  },
  returns: v.object({
    resolvedChartCount: v.number(),
    loadedPointCount: v.number(),
  }),
  handler: async (step, args) => {
    const job = await step.runQuery(
      internal.context.memoryProjectionStore.getMemoryProjectionJob,
      { jobId: args.jobId },
      { inline: true },
    );
    if (!job) {
      throw new Error(`Memory projection job ${args.jobId} was not found`);
    }
    try {
      const charts = await getChartsForProjection(step, {
        namespace: job.namespace,
        chartIds: normalizeChartIds(job.chartIds),
      });
      await step.runMutation(
        internal.context.memoryProjectionStore
          .updateMemoryProjectionJobProgress,
        {
          jobId: args.jobId,
          status: "running",
          phase: "loadingMembers",
          resolvedChartCount: charts.length,
        },
        { inline: true },
      );
      const seeds = await getProjectionSeeds(step, charts, job.limit);
      await step.runMutation(
        internal.context.memoryProjectionStore
          .updateMemoryProjectionJobProgress,
        {
          jobId: args.jobId,
          status: "running",
          phase: "projecting",
          resolvedChartCount: charts.length,
          loadedPointCount: seeds.length,
        },
        { inline: true },
      );
      const points = await step.runAction(
        internal.context.memoryProjections.projectEmbeddingCloud,
        { members: seeds },
      );
      await step.runMutation(
        internal.context.memoryProjectionStore.completeMemoryProjectionJob,
        {
          jobId: args.jobId,
          resolvedChartCount: charts.length,
          loadedPointCount: seeds.length,
          points,
        },
        { inline: true },
      );
      return {
        resolvedChartCount: charts.length,
        loadedPointCount: seeds.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Projection workflow failed";
      await step.runMutation(
        internal.context.memoryProjectionStore.failMemoryProjectionJob,
        {
          jobId: args.jobId,
          error: message,
        },
        { inline: true },
      );
      throw error;
    }
  },
});

export const startMemoryProjection = action({
  args: {
    namespace: v.string(),
    chartIds: v.optional(v.array(v.string())),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    jobId: Id<"memoryProjectionJobs">;
    workflowId: string;
    status: "running";
  }> => {
    const limit = clampProjectionLimit(args.limit);
    const chartIds = normalizeChartIds(args.chartIds);
    const jobId: Id<"memoryProjectionJobs"> = await ctx.runMutation(
      internal.context.memoryProjectionStore.createMemoryProjectionJob,
      {
        namespace: args.namespace,
        chartIds,
        query: args.query?.trim() ?? "",
        limit,
      },
    );
    try {
      const workflowId: string = String(
        await workflowManager.start(
          ctx,
          internal.context.memoryProjections.runMemoryProjectionWorkflow,
          { jobId },
          { startAsync: true },
        ),
      );
      await ctx.runMutation(
        internal.context.memoryProjectionStore.attachMemoryProjectionWorkflow,
        {
          jobId,
          workflowId,
        },
      );
      return {
        jobId,
        workflowId,
        status: "running" as const,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start projection";
      await ctx.runMutation(
        internal.context.memoryProjectionStore.failMemoryProjectionJob,
        {
          jobId,
          error: message,
        },
      );
      throw error;
    }
  },
});

export const getMemoryProjectionStatus = query({
  args: {
    jobId: v.id("memoryProjectionJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return null;
    }
    const workflowStatus =
      job.workflowId && (job.status === "pending" || job.status === "running")
        ? await workflowManager.status(ctx, job.workflowId as never)
        : null;
    return {
      jobId: job._id,
      namespace: job.namespace,
      chartIds: job.chartIds,
      query: job.query,
      limit: job.limit,
      workflowId: job.workflowId ?? null,
      status:
        workflowStatus?.type === "failed"
          ? "failed"
          : workflowStatus?.type === "completed"
            ? "completed"
            : job.status,
      phase:
        workflowStatus?.type === "failed"
          ? "failed"
          : workflowStatus?.type === "completed"
            ? "completed"
            : job.phase,
      resolvedChartCount: job.resolvedChartCount ?? 0,
      loadedPointCount: job.loadedPointCount ?? 0,
      points: job.points ?? [],
      lastError:
        workflowStatus?.type === "failed"
          ? workflowStatus.error
          : (job.lastError ?? null),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt ?? null,
      failedAt: job.failedAt ?? null,
    };
  },
});
