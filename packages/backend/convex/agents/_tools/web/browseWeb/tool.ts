import { tool } from "@very-coffee/agent-identity";
import { internal } from "_generated/api.js";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    browseWeb: InferUITool<Tool>;
  }
}

export function browseWebTool() {
  return tool({
    name: "browseWeb" as const,
    description:
      "Run a Browserbase browser session via the executor service (Stagehand Computer-Use agent): optional start URL, then complete the instruction with autonomous browser actions. For listing search hits, use searchWeb first.",
    inputSchema: inputArgs({
      instruction: z
        .string()
        .min(1)
        .describe(
          "What the browser agent should accomplish (e.g. interact with the page, read sections, submit forms).",
        ),
      startUrl: z
        .string()
        .url()
        .optional()
        .describe(
          "Optional URL to open before running the instruction (recommended for focused tasks).",
        ),
      maxSteps: z
        .number()
        .int()
        .positive()
        .max(40)
        .optional()
        .describe("Max agent steps (default 20, max 40)."),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.web.browseWeb.internal.execute,
          {
            instruction: args.instruction,
            startUrl: args.startUrl,
            maxSteps: args.maxSteps,
          },
        ),
      );
    },
  });
}
