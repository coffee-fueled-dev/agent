import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    searchMemory: InferUITool<Tool>;
  }
}

export function searchMemoryTool(): DynamicToolDef<"searchMemory", unknown, Tool> {
  return dynamicTool({
    name: "searchMemory" as const,
    description:
      "Search stored memories using hybrid semantic and lexical retrieval.",
    args: z.object({
      query: z.string().describe("Natural language search query"),
      limit: z.number().optional().describe("Max results (default 10)"),
      retrievalMode: z
        .enum(["vector", "lexical", "hybrid"])
        .optional()
        .describe("Retrieval strategy; default is hybrid"),
      minScore: z
        .number()
        .optional()
        .describe("Minimum fused score floor; omit for no floor"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.memory.searchMemory.internal.execute,
            {
              namespace: ctx.namespace,
              query: args.query,
              limit: args.limit,
              retrievalMode: args.retrievalMode,
              minScore: args.minScore,
            },
          );
        })(),
      );
    },
  });
}
