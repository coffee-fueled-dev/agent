import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";
import { lexicalSearchHitValidator } from "../searchHitValidators.js";

export const lexicalSearch = query({
  args: {
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    sourceSystem: v.optional(v.string()),
  },
  returns: v.array(lexicalSearchHitValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const candidateCap = Math.max(limit * 4, 40);

    const textHits = await ctx.db
      .query("searchTexts")
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

    const orderedItemIds: Id<"searchItems">[] = [];
    const selectedItems = new Set<Id<"searchItems">>();
    for (const row of textHits) {
      if (selectedItems.has(row.searchItem)) continue;
      selectedItems.add(row.searchItem);
      orderedItemIds.push(row.searchItem);
      if (orderedItemIds.length >= limit) break;
    }

    const propertyHitsByItem = new Map<
      Id<"searchItems">,
      Array<{ propKey: string; text: string }>
    >();
    for (const row of textHits) {
      if (!selectedItems.has(row.searchItem)) continue;
      const list = propertyHitsByItem.get(row.searchItem) ?? [];
      list.push({ propKey: row.propKey, text: row.text });
      propertyHitsByItem.set(row.searchItem, list);
    }

    const out = [];

    for (const itemId of orderedItemIds) {
      const canonical = await ctx.db.get(itemId);
      const propertyHits = propertyHitsByItem.get(itemId);
      if (!canonical || !propertyHits) continue;

      out.push({
        ...canonical,
        propertyHits,
      });
    }

    return out;
  },
});
