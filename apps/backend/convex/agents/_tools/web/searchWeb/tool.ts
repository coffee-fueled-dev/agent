import { tool } from "@very-coffee/agent-identity";
import { internal } from "_generated/api.js";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    searchWeb: InferUITool<Tool>;
  }
}

export function searchWebTool() {
  return tool({
    name: "searchWeb" as const,
    description:
      "Search the web and return structured results (title, URL, metadata).",
    inputSchema: inputArgs({
      query: z.string().describe("Search query (1-200 characters)."),
      numResults: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe("Number of results (1-25, default 10)."),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.web.searchWeb.internal.execute,
          {
            query: args.query,
            numResults: args.numResults,
          },
        ),
      );
    },
  });
}
