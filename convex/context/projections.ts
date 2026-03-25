import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { UMAP } from "umap-js";
import { components, internal } from "../_generated/api";
import {
  action,
  internalAction,
  internalQuery,
  query,
} from "../_generated/server";
import { workflow as workflowManager } from "../workflow";

const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 300;
const EMBEDDING_PAGE_SIZE = 100;

function clampLimit(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.max(12, Math.min(MAX_LIMIT, Math.floor(value)));
}

function normalizeCoordinates(points: number[][]) {
  if (points.length === 0) return [];
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      const v = p[i] ?? 0;
      mins[i] = Math.min(mins[i]!, v);
      maxs[i] = Math.max(maxs[i]!, v);
    }
  }
  const centers = mins.map((m, i) => (m + maxs[i]!) / 2);
  const scale = Math.max(...maxs.map((m, i) => m - mins[i]!), 1);
  return points.map((p) => p.map((v, i) => ((v ?? 0) - centers[i]!) / scale));
}

function projectCoordinates(vectors: number[][]) {
  if (vectors.length === 0) return [];
  if (vectors.length === 1) return [[0, 0, 0]];
  if (vectors.length === 2)
    return [
      [-0.75, 0, 0],
      [0.75, 0, 0],
    ];
  if (vectors.length === 3)
    return [
      [-0.7, -0.45, 0],
      [0.7, -0.45, 0],
      [0, 0.8, 0],
    ];
  try {
    const umap = new UMAP({
      nComponents: 3,
      nNeighbors: Math.max(2, Math.min(15, vectors.length - 1)),
      minDist: 0.15,
      spread: 1,
    });
    return normalizeCoordinates(umap.fit(vectors));
  } catch {
    return normalizeCoordinates(
      vectors.map((vec, i) => [
        vec[0] ?? 0,
        vec[1] ?? 0,
        vec[2] ?? i / Math.max(vectors.length - 1, 1),
      ]),
    );
  }
}

const seedValidator = v.object({
  entryId: v.string(),
  key: v.string(),
  title: v.optional(v.string()),
  textPreview: v.string(),
  mimeType: v.optional(v.string()),
  embedding: v.array(v.number()),
});

export const projectEmbeddingCloud = internalAction({
  args: { seeds: v.array(seedValidator) },
  handler: async (_ctx, args) => {
    const coords = projectCoordinates(args.seeds.map((s) => s.embedding));
    return args.seeds.map((s, i) => ({
      entryId: s.entryId,
      key: s.key,
      title: s.title,
      textPreview: s.textPreview,
      mimeType: s.mimeType,
      x: coords[i]?.[0] ?? 0,
      y: coords[i]?.[1] ?? 0,
      z: coords[i]?.[2] ?? 0,
    }));
  },
});

type PaginatedEmbeddings = PaginationResult<{
  entryId: string;
  embedding: number[];
}>;

type PaginatedEntries = PaginationResult<{
  entryId: string;
  key: string;
  title?: string;
  textPreview: string;
}>;

type FileMeta = { entryId: string; mimeType: string };

type ProjectionPoint = {
  entryId: string;
  key: string;
  title?: string;
  textPreview: string;
  mimeType?: string;
  x: number;
  y: number;
  z: number;
};

const projectionApi = components.context.public.projection;

export const runContextProjectionWorkflow = workflowManager.define({
  args: { jobId: v.string() },
  returns: v.object({ count: v.number() }),
  handler: async (step, args): Promise<{ count: number }> => {
    const job = await step.runQuery(
      projectionApi.getJob,
      { jobId: args.jobId },
      { inline: true },
    );
    if (!job) throw new Error(`Projection job ${args.jobId} not found`);

    try {
      const embeddings: Array<{ entryId: string; embedding: number[] }> = [];
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone && embeddings.length < job.limit) {
        const result: PaginatedEmbeddings = await step.runQuery(
          projectionApi.loadEmbeddingPage,
          {
            namespace: job.namespace,
            paginationOpts: {
              cursor,
              numItems: Math.min(
                EMBEDDING_PAGE_SIZE,
                job.limit - embeddings.length,
              ),
            },
          },
          { inline: true },
        );
        embeddings.push(...result.page);
        cursor = result.continueCursor;
        isDone = result.isDone;
      }

      const currentEntryIds: string[] = await step.runQuery(
        projectionApi.loadCurrentEntryIds,
        { namespace: job.namespace },
        { inline: true },
      );
      const currentSet = new Set(currentEntryIds);
      const currentEmbeddings = embeddings.filter((e) =>
        currentSet.has(e.entryId),
      );

      await step.runMutation(
        projectionApi.updatePhase,
        {
          jobId: args.jobId,
          phase: "loading",
          loadedCount: currentEmbeddings.length,
        },
        { inline: true },
      );

      const entryMap = new Map<
        string,
        { key: string; title?: string; textPreview: string }
      >();
      let entryCursor: string | null = null;
      let entriesDone = false;
      while (!entriesDone) {
        const entryResult: PaginatedEntries = await step.runQuery(
          projectionApi.loadEntryPage,
          {
            namespace: job.namespace,
            paginationOpts: {
              cursor: entryCursor,
              numItems: EMBEDDING_PAGE_SIZE,
            },
          },
          { inline: true },
        );
        for (const entry of entryResult.page) {
          entryMap.set(entry.entryId, {
            key: entry.key,
            title: entry.title,
            textPreview: entry.textPreview,
          });
        }
        entryCursor = entryResult.continueCursor;
        entriesDone = entryResult.isDone;
      }

      const entryIds = currentEmbeddings.map((e) => e.entryId);
      const fileMetas: FileMeta[] = await step.runQuery(
        internal.context.projections.loadFileMetas,
        { entryIds },
        { inline: true },
      );
      const fileMap = new Map(fileMetas.map((f) => [f.entryId, f.mimeType]));

      const seeds = currentEmbeddings
        .map((emb) => {
          const meta = entryMap.get(emb.entryId);
          if (!meta) return null;
          return {
            entryId: emb.entryId,
            key: meta.key,
            title: meta.title,
            textPreview: meta.textPreview,
            mimeType: fileMap.get(emb.entryId),
            embedding: emb.embedding,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      await step.runMutation(
        projectionApi.updatePhase,
        { jobId: args.jobId, phase: "projecting", loadedCount: seeds.length },
        { inline: true },
      );

      const points: ProjectionPoint[] = await step.runAction(
        internal.context.projections.projectEmbeddingCloud,
        { seeds },
      );

      await step.runMutation(
        projectionApi.markCompleted,
        { jobId: args.jobId, points },
        { inline: true },
      );

      return { count: points.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Projection failed";
      await step.runMutation(
        projectionApi.markFailed,
        { jobId: args.jobId, error: message },
        { inline: true },
      );
      throw error;
    }
  },
});

export const loadFileMetas = internalQuery({
  args: { entryIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Array<{ entryId: string; mimeType: string }> = [];
    for (const entryId of args.entryIds) {
      const file = await ctx.db
        .query("contextFiles")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (file) results.push({ entryId, mimeType: file.mimeType });
    }
    return results;
  },
});

export const startContextProjection = action({
  args: {
    namespace: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);
    const jobId = await ctx.runMutation(projectionApi.createJob, {
      namespace: args.namespace,
      limit,
    });
    try {
      const workflowId = String(
        await workflowManager.start(
          ctx,
          internal.context.projections.runContextProjectionWorkflow,
          { jobId },
          { startAsync: true },
        ),
      );
      await ctx.runMutation(projectionApi.markRunning, {
        jobId,
        workflowId,
      });
      return { jobId, status: "running" as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start projection";
      await ctx.runMutation(projectionApi.markFailed, {
        jobId,
        error: message,
      });
      throw error;
    }
  },
});

export const getContextProjectionStatus = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(projectionApi.getProjectionStatus, args);
  },
});

export const getLatestProjection = query({
  args: { namespace: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(projectionApi.getLatestProjection, args);
  },
});
