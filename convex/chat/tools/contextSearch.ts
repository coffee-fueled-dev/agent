import { z } from "zod/v4";
import { api } from "../../_generated/api";
import {
  dynamicTool,
  withFormattedResults,
} from "../../llms/tools/_libs/toolkit";

export function searchContextTool(namespace: string) {
  return dynamicTool({
    name: "searchContext" as const,
    description:
      "Search the user's context entries using hybrid semantic and lexical retrieval.",
    args: z.object({
      query: z.string().describe("Natural language search query"),
      limit: z.number().optional().describe("Max results (default 10)"),
      retrievalMode: z
        .enum(["vector", "lexical", "hybrid"])
        .optional()
        .describe("Retrieval strategy"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const results = await ctx.runAction(
            api.context.search.searchContext,
            {
              namespace,
              query: args.query,
              limit: args.limit,
              retrievalMode: args.retrievalMode,
            },
          );
          return { results };
        })(),
      );
    },
  });
}
