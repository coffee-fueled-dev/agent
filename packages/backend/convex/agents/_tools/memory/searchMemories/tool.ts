import { tool } from "@very-coffee/agent-identity";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { components } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    searchMemories: InferUITool<Tool>;
  }
}

export function searchMemoriesTool() {
  return tool({
    name: "searchMemories" as const,
    description:
      "Hybrid search over session memory: combines lexical and vector similarity using reciprocal rank fusion (RRF). Uses the same namespace as this chat session.",
    inputSchema: z.object({
      query: z.string().describe("Natural-language query to search for."),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max fused results to return (default 20)."),
      perArmLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max candidates per lexical/vector arm before RRF."),
      k: z
        .number()
        .optional()
        .describe("RRF rank constant (default 60)."),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      return await withFormattedResults(
        ctx.env.runAction(components.memory.public.search.searchMemory, {
          namespace: ctx.env.namespace,
          query: args.query,
          limit: args.limit,
          perArmLimit: args.perArmLimit,
          k: args.k,
        }),
      );
    },
  });
}
