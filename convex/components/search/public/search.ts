import { v } from "convex/values";
import { type QueryCtx, query } from "../_generated/server";

export const searchFeatures = query({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
    sourceSystem: v.optional(v.string()),
  },
  handler: async (ctx: QueryCtx, args) => {
    const limit = args.limit ?? 20;
    const includeHistorical = args.includeHistorical ?? false;

    const runSearch = (sourceSystem?: string) => {
      return ctx.db
        .query("searchFeatures")
        .withSearchIndex("search_text", (q) => {
          let chain = q
            .search("text", args.query)
            .eq("namespace", args.namespace);
          if (!includeHistorical) {
            chain = chain.eq("status", "current");
          }
          if (sourceSystem) {
            chain = chain.eq("sourceSystem", sourceSystem);
          }
          return chain;
        })
        .take(limit);
    };

    const docs = await runSearch(args.sourceSystem);
    return docs.map((doc) => ({
      namespace: doc.namespace,
      featureId: doc.featureId,
      sourceSystem: doc.sourceSystem,
      source: doc.source,
      title: doc.title,
      text: doc.text,
      status: doc.status,
      updatedAt: doc.updatedAt,
    }));
  },
});
