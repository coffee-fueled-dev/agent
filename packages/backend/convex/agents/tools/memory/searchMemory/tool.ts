import type { InferUITool, Tool } from "ai";
import { tool } from "@very-coffee/agent-identity";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    searchMemory: InferUITool<Tool>;
  }
}

export function searchMemoryTool() {
  return tool({
    name: "searchMemory" as const,
    description:
      "Search stored memories using hybrid semantic and lexical retrieval.",
    inputSchema: z.object({
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
    handler: async (
      ctx: ToolRuntimeContext<ConvexAgentEnv>,
      args,
    ) => {
      return await withFormattedResults(
        ctx.env.runAction(internal.agents.tools.memory.searchMemory.internal.execute, {
          namespace: ctx.namespace ?? ctx.env.namespace,
          query: args.query,
          limit: args.limit,
          retrievalMode: args.retrievalMode,
          minScore: args.minScore,
        }),
      );
    },
  });
}
