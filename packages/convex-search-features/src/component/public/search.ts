import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";
import { sourceRefValidator } from "../schema.js";

/** Lexical hit: canonical row plus which text slice matched (for RRF / display). */
const searchFeatureHitValidator = v.object({
  _id: v.id("searchFeatureItems"),
  _creationTime: v.number(),
  namespace: v.string(),
  featureId: v.string(),
  sourceSystem: v.string(),
  sourceRef: sourceRefValidator,
  title: v.optional(v.string()),
  updatedAt: v.number(),
  bucketId: v.optional(v.string()),
  bucketType: v.optional(v.string()),
  supersededAt: v.optional(v.number()),
  sourceVersion: v.optional(v.number()),
  text: v.string(),
  matchedPropKey: v.string(),
});

export const searchFeatures = query({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    sourceSystem: v.optional(v.string()),
  },
  returns: v.array(searchFeatureHitValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const candidateCap = Math.max(limit * 4, 40);

    const textHits = await ctx.db
      .query("searchFeatureTextSlices")
      .withSearchIndex("search_text", (q) => {
        let chain = q
          .search("text", args.query)
          .eq("namespace", args.namespace);
        if (args.sourceSystem) {
          chain = chain.eq("sourceSystem", args.sourceSystem);
        }
        return chain;
      })
      .take(candidateCap);

    const seen = new Set<string>();
    const orderedFeatureIds: string[] = [];
    const sliceByFeature = new Map<
      string,
      { text: string; matchedPropKey: string }
    >();

    for (const row of textHits) {
      if (seen.has(row.featureId)) continue;
      seen.add(row.featureId);
      orderedFeatureIds.push(row.featureId);
      sliceByFeature.set(row.featureId, {
        text: row.text,
        matchedPropKey: row.propKey,
      });
      if (orderedFeatureIds.length >= limit) break;
    }

    const out: Array<{
      _id: Id<"searchFeatureItems">;
      _creationTime: number;
      namespace: string;
      featureId: string;
      sourceSystem: string;
      sourceRef: string;
      title?: string;
      updatedAt: number;
      bucketId?: string;
      bucketType?: string;
      supersededAt?: number;
      sourceVersion?: number;
      text: string;
      matchedPropKey: string;
    }> = [];

    for (const featureId of orderedFeatureIds) {
      const canonical = await ctx.db
        .query("searchFeatureItems")
        .withIndex("by_namespace_featureId", (q) =>
          q.eq("namespace", args.namespace).eq("featureId", featureId),
        )
        .first();
      const slice = sliceByFeature.get(featureId);
      if (!canonical || !slice) continue;

      out.push({
        _id: canonical._id,
        _creationTime: canonical._creationTime,
        namespace: canonical.namespace,
        featureId: canonical.featureId,
        sourceSystem: canonical.sourceSystem,
        sourceRef: canonical.sourceRef,
        title: canonical.title,
        updatedAt: canonical.updatedAt,
        bucketId: canonical.bucketId,
        bucketType: canonical.bucketType,
        supersededAt: canonical.supersededAt,
        sourceVersion: canonical.sourceVersion,
        text: slice.text,
        matchedPropKey: slice.matchedPropKey,
      });
    }

    return out;
  },
});
