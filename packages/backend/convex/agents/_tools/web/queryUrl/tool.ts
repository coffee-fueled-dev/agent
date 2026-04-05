import { tool } from "@very-coffee/agent-identity";
import { internal } from "_generated/api.js";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    queryUrl: InferUITool<Tool>;
  }
}

export function queryUrlTool() {
  return tool({
    name: "queryUrl" as const,
    description:
      "Answer using Gemini with Google Search + URL context (fetches public page content from URLs you provide). Cheaper than browseWeb for summaries and research; URLs must be public HTTPS. See https://ai.google.dev/gemini-api/docs/url-context",
    inputSchema: inputArgs({
      query: z
        .string()
        .min(1)
        .describe(
          "What to find out or summarize (search + optional page context).",
        ),
      url: z
        .string()
        .url()
        .optional()
        .describe(
          "Optional public page URL to fetch and ground on (https, no login/paywall).",
        ),
      model: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Optional Gemini model id (default: deployment QUERY_URL_GEMINI_MODEL or gemini-2.5-flash).",
        ),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.web.queryUrl.internal.execute,
          {
            query: args.query,
            url: args.url,
            model: args.model,
          },
        ),
      );
    },
  });
}
