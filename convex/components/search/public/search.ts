import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { query } from "../_generated/server";
import schema from "../schema";

export const searchFeatures = query({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
    sourceSystem: v.optional(v.string()),
  },
  returns: v.array(doc(schema, "searchFeatures")),
  handler: async (ctx, args) => {
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

    return await runSearch(args.sourceSystem);
  },
});
