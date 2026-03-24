import { v } from "convex/values";
import { UMAP } from "umap-js";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalQuery,
  query,
} from "../_generated/server";
import { ContextClient } from "../components/context/client";
import { hasStatus } from "../lib/status";
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

type EmbeddingPage = {
  items: Array<{ entryId: string; embedding: number[] }>;
  cursor: string;
  isDone: boolean;
};

type EntryPage = {
  page: Array<{
    entryId: string;
    key: string;
    title?: string;
    textPreview: string;
  }>;
  continueCursor: string;
  isDone: boolean;
};

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

export const runContextProjectionWorkflow = workflowManager.define({
  args: { jobId: v.id("contextProjectionJobs") },
  returns: v.object({ count: v.number() }),
  handler: async (step, args): Promise<{ count: number }> => {
    const job = await step.runQuery(
      internal.context.projectionStore.getJob,
      { jobId: args.jobId },
      { inline: true },
    );
    if (!job) throw new Error(`Projection job ${args.jobId} not found`);

    try {
      const embeddings: Array<{ entryId: string; embedding: number[] }> = [];
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone && embeddings.length < job.limit) {
        const page: EmbeddingPage = await step.runQuery(
          internal.context.projections.loadEmbeddingPage,
          {
            namespace: job.namespace,
            cursor,
            limit: Math.min(EMBEDDING_PAGE_SIZE, job.limit - embeddings.length),
          },
          { inline: true },
        );
        embeddings.push(...page.items);
        cursor = page.cursor;
        isDone = page.isDone;
      }

      await step.runMutation(
        internal.context.projectionStore.updatePhase,
        {
          jobId: args.jobId,
          phase: "loading",
          loadedCount: embeddings.length,
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
        const page: EntryPage = await step.runQuery(
          internal.context.projections.loadEntryPage,
          {
            namespace: job.namespace,
            cursor: entryCursor,
            numItems: EMBEDDING_PAGE_SIZE,
          },
          { inline: true },
        );
        for (const entry of page.page) {
          entryMap.set(entry.entryId, {
            key: entry.key,
            title: entry.title,
            textPreview: entry.textPreview,
          });
        }
        entryCursor = page.continueCursor;
        entriesDone = page.isDone;
      }

      const entryIds = embeddings.map((e) => e.entryId);
      const fileMetas: FileMeta[] = await step.runQuery(
        internal.context.projections.loadFileMetas,
        { entryIds },
        { inline: true },
      );
      const fileMap = new Map(fileMetas.map((f) => [f.entryId, f.mimeType]));

      const seeds = embeddings
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
        .filter(Boolean) as Array<{
        entryId: string;
        key: string;
        title?: string;
        textPreview: string;
        mimeType?: string;
        embedding: number[];
      }>;

      await step.runMutation(
        internal.context.projectionStore.updatePhase,
        { jobId: args.jobId, phase: "projecting", loadedCount: seeds.length },
        { inline: true },
      );

      const points: ProjectionPoint[] = await step.runAction(
        internal.context.projections.projectEmbeddingCloud,
        { seeds },
      );

      await step.runMutation(
        internal.context.projectionStore.markCompleted,
        { jobId: args.jobId, points },
        { inline: true },
      );

      return { count: points.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Projection failed";
      await step.runMutation(
        internal.context.projectionStore.markFailed,
        { jobId: args.jobId, error: message },
        { inline: true },
      );
      throw error;
    }
  },
});

export const loadEmbeddingPage = internalQuery({
  args: {
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("contextEntryEmbeddings")
      .withIndex("by_namespace_createdAt", (q) =>
        q.eq("namespace", args.namespace),
      )
      .paginate({
        cursor: (args.cursor ?? null) as never,
        numItems: args.limit,
      });

    const items: Array<{ entryId: string; embedding: number[] }> = [];
    for (const doc of result.page) {
      const version = await ctx.db
        .query("contextEntryVersions")
        .withIndex("by_entryId", (q) => q.eq("entryId", doc.entryId))
        .first();
      if (!version || version.data.status === "current") {
        items.push({ entryId: doc.entryId, embedding: doc.embedding });
      }
    }

    return {
      items,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export const loadEntryPage = internalQuery({
  args: {
    namespace: v.string(),
    cursor: v.union(v.string(), v.null()),
    numItems: v.number(),
  },
  handler: async (ctx, args) => {
    return await createContextClient().list(ctx, {
      namespace: args.namespace,
      paginationOpts: {
        cursor: (args.cursor ?? null) as never,
        numItems: args.numItems,
      },
    });
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
  handler: async (
    ctx,
    args,
  ): Promise<{
    jobId: Id<"contextProjectionJobs">;
    status: "running";
  }> => {
    const limit = clampLimit(args.limit);
    const jobId: Id<"contextProjectionJobs"> = await ctx.runMutation(
      internal.context.projectionStore.createJob,
      { namespace: args.namespace, limit },
    );
    try {
      const workflowId = String(
        await workflowManager.start(
          ctx,
          internal.context.projections.runContextProjectionWorkflow,
          { jobId },
          { startAsync: true },
        ),
      );
      await ctx.runMutation(internal.context.projectionStore.markRunning, {
        jobId,
        workflowId,
      });
      return { jobId, status: "running" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start projection";
      await ctx.runMutation(internal.context.projectionStore.markFailed, {
        jobId,
        error: message,
      });
      throw error;
    }
  },
});

export const getContextProjectionStatus = query({
  args: { jobId: v.id("contextProjectionJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    if (hasStatus(job, "completed")) {
      return {
        status: "completed" as const,
        points: job.data.points,
        completedAt: job.data.completedAt,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    if (hasStatus(job, "failed")) {
      return {
        status: "failed" as const,
        error: job.data.error,
        failedAt: job.data.failedAt,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    if (hasStatus(job, "running")) {
      return {
        status: "running" as const,
        phase: job.data.phase,
        loadedCount: job.data.loadedCount,
        stale: job.stale,
        namespace: job.namespace,
      };
    }
    return {
      status: "pending" as const,
      stale: job.stale,
      namespace: job.namespace,
    };
  },
});

export const getLatestProjection = query({
  args: { namespace: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("contextProjectionJobs")
      .withIndex("by_namespace_createdAt", (q) =>
        q.eq("namespace", args.namespace),
      )
      .order("desc")
      .first();
    if (!job) return null;
    if (hasStatus(job, "completed")) {
      return {
        jobId: job._id,
        status: "completed" as const,
        points: job.data.points,
        completedAt: job.data.completedAt,
        stale: job.stale,
      };
    }
    if (hasStatus(job, "running")) {
      return {
        jobId: job._id,
        status: "running" as const,
        phase: job.data.phase,
        loadedCount: job.data.loadedCount,
        stale: job.stale,
      };
    }
    if (hasStatus(job, "failed")) {
      return {
        jobId: job._id,
        status: "failed" as const,
        error: job.data.error,
        stale: job.stale,
      };
    }
    return { jobId: job._id, status: "pending" as const, stale: job.stale };
  },
});
