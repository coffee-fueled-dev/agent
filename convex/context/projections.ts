import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { z } from "zod/v4";
import { UMAP } from "umap-js";
import { components, internal } from "../_generated/api";
import { sessionAction, sessionQuery } from "../customFunctions";
import {
  internalAction,
  internalQuery,
} from "../_generated/server";
import { pool } from "../workpool";

const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 1000;
const EMBEDDING_PAGE_SIZE = 100;
const POINTS_BATCH_SIZE = 50;
const FILE_META_BATCH_SIZE = 100;

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

/** Fisher-Yates shuffle, mutates in place */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

type PaginatedVersions = PaginationResult<{
  entryId: string;
  data: { status: string };
}>;

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- new functions available after codegen
const projApi = projectionApi as Record<string, any>;

async function loadCurrentEntryIdsPaginated(
  ctx: { runQuery: (...args: any[]) => Promise<any> },
  namespace: string,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const result: PaginatedVersions = await ctx.runQuery(
      projApi.loadCurrentEntryIdPage,
      { namespace, paginationOpts: { cursor, numItems: EMBEDDING_PAGE_SIZE } },
    );
    for (const row of result.page) {
      if (row.data.status === "current") ids.push(row.entryId);
    }
    cursor = result.continueCursor;
    isDone = result.isDone;
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Fat action: load data, run UMAP, write points to table
// ---------------------------------------------------------------------------

export const computeProjection = internalAction({
  args: { jobId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(projectionApi.getJob, { jobId: args.jobId });
    if (!job) throw new Error(`Projection job ${args.jobId} not found`);

    await ctx.runMutation(projectionApi.updatePhase, {
      jobId: args.jobId,
      phase: "loading",
      loadedCount: 0,
    });

    // 1. Load embeddings (paginated)
    const embeddings: Array<{ entryId: string; embedding: number[] }> = [];
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const result: PaginatedEmbeddings = await ctx.runQuery(
        projectionApi.loadEmbeddingPage,
        {
          namespace: job.namespace,
          paginationOpts: { cursor, numItems: EMBEDDING_PAGE_SIZE },
        },
      );
      embeddings.push(...result.page);
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    // 2. Load current entry IDs (paginated)
    const currentEntryIds = await loadCurrentEntryIdsPaginated(
      ctx,
      job.namespace,
    );
    const currentSet = new Set(currentEntryIds);
    let currentEmbeddings = embeddings.filter((e) => currentSet.has(e.entryId));

    // 3. Sample if exceeding limit
    if (currentEmbeddings.length > args.limit) {
      shuffle(currentEmbeddings);
      currentEmbeddings = currentEmbeddings.slice(0, args.limit);
    }

    await ctx.runMutation(projectionApi.updatePhase, {
      jobId: args.jobId,
      phase: "loading",
      loadedCount: currentEmbeddings.length,
    });

    if (currentEmbeddings.length === 0) {
      await ctx.runMutation(projectionApi.markCompleted, {
        jobId: args.jobId,
        pointCount: 0,
      });
      return { count: 0 };
    }

    // 4. Load entry metadata (paginated)
    const entryMap = new Map<
      string,
      { key: string; title?: string; textPreview: string }
    >();
    let entryCursor: string | null = null;
    let entriesDone = false;
    while (!entriesDone) {
      const entryResult: PaginatedEntries = await ctx.runQuery(
        projectionApi.loadEntryPage,
        {
          namespace: job.namespace,
          paginationOpts: {
            cursor: entryCursor,
            numItems: EMBEDDING_PAGE_SIZE,
          },
        },
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

    // 5. Load file metas in batches
    const entryIds = currentEmbeddings.map((e) => e.entryId);
    const fileMap = new Map<string, string>();
    for (let i = 0; i < entryIds.length; i += FILE_META_BATCH_SIZE) {
      const batch = entryIds.slice(i, i + FILE_META_BATCH_SIZE);
      const metas: Array<{ entryId: string; mimeType: string }> =
        await ctx.runQuery(internal.context.projections.loadFileMetas, {
          entryIds: batch,
        });
      for (const m of metas) fileMap.set(m.entryId, m.mimeType);
    }

    // 6. Build seeds and run UMAP
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

    await ctx.runMutation(projectionApi.updatePhase, {
      jobId: args.jobId,
      phase: "projecting",
      loadedCount: seeds.length,
    });

    const coords = projectCoordinates(seeds.map((s) => s.embedding));
    const points: ProjectionPoint[] = seeds.map((s, i) => ({
      entryId: s.entryId,
      key: s.key,
      title: s.title,
      textPreview: s.textPreview,
      mimeType: s.mimeType,
      x: coords[i]?.[0] ?? 0,
      y: coords[i]?.[1] ?? 0,
      z: coords[i]?.[2] ?? 0,
    }));

    // 7. Clear old points from any previous completed job
    const latestProjection = await ctx.runQuery(
      projectionApi.getLatestProjection,
      { namespace: job.namespace },
    );
    if (
      latestProjection &&
      "jobId" in latestProjection &&
      latestProjection.status === "completed" &&
      latestProjection.jobId !== args.jobId
    ) {
      let hasMore = true;
      while (hasMore) {
        const result = (await ctx.runMutation(projApi.clearPointsForJob, {
          jobId: latestProjection.jobId,
        })) as { hasMore: boolean };
        hasMore = result.hasMore;
      }
    }

    // 8. Write new points in batches
    for (let i = 0; i < points.length; i += POINTS_BATCH_SIZE) {
      await ctx.runMutation(projApi.writePointsBatch, {
        jobId: args.jobId,
        points: points.slice(i, i + POINTS_BATCH_SIZE),
      });
    }

    // 9. Mark completed
    await ctx.runMutation(projectionApi.markCompleted, {
      jobId: args.jobId,
      pointCount: points.length,
    });

    return { count: points.length };
  },
});

// ---------------------------------------------------------------------------
// onComplete handler
// ---------------------------------------------------------------------------

export const onProjectionComplete = pool.defineOnComplete({
  context: v.object({ jobId: v.string() }),
  handler: async (ctx, { context, result }) => {
    if (result.kind !== "success") {
      const error = result.kind === "failed" ? result.error : "Canceled";
      await ctx.runMutation(projectionApi.markFailed, {
        jobId: context.jobId,
        error,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// File meta loader (batched by caller)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export const startContextProjection = sessionAction({
  args: {
    namespace: z.string(),
    limit: z.number().optional(),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);
    const jobId = await ctx.runMutation(projectionApi.createJob, {
      namespace: args.namespace,
      limit,
    });
    try {
      const workId = await pool.enqueueAction(
        ctx,
        internal.context.projections.computeProjection,
        { jobId, limit },
        {
          onComplete: internal.context.projections.onProjectionComplete,
          context: { jobId },
        },
      );
      await ctx.runMutation(projectionApi.markRunning, {
        jobId,
        workflowId: String(workId),
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

// ---------------------------------------------------------------------------
// Query wrappers
// ---------------------------------------------------------------------------

export const getContextProjectionStatus = sessionQuery({
  args: { jobId: z.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(projectionApi.getProjectionStatus, args);
  },
});

export const getLatestProjection = sessionQuery({
  args: { namespace: z.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(projectionApi.getLatestProjection, args);
  },
});
