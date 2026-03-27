import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { graph } from "../graph";
import { createContextRag } from "../internal/rag";

const DEFAULT_SIMILARITY_K = 6;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

export const scheduleSimilarityEdges = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.internal.similarity.createSimilarityEdgesAsync,
      args,
    );
  },
});

export const createSimilarityEdgesAsync = internalAction({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    embedding: v.array(v.number()),
    apiKey: v.optional(v.string()),
    similarityK: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rag = createContextRag(args.apiKey);
    const k = args.similarityK ?? DEFAULT_SIMILARITY_K;
    const threshold = args.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

    const { entries, results } = await rag.search(ctx, {
      namespace: args.namespace,
      query: args.embedding,
      limit: k + 1,
      filters: [{ name: "status", value: "current" }],
    });

    for (const entry of entries) {
      if (entry.entryId === args.entryId) continue;
      const score = results
        .filter((r) => r.entryId === entry.entryId)
        .reduce((max, r) => Math.max(max, r.score), 0);
      if (score < threshold) continue;
      await graph.edges.create(ctx, {
        label: "SIMILAR_TO",
        from: args.entryId,
        to: entry.entryId,
        properties: { score },
      });
    }
  },
});
