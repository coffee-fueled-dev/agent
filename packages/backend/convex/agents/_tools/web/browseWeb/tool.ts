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

const browseEffortSchema = z.enum(["low", "medium", "high"]);

export function browseWebTool() {
  return tool({
    name: "browseWeb" as const,
    instructions: [
      "Use browse web to perform tasks in a real browser session.",
      "Prefer searchWeb for discovery and only use browse web if you need to perform a task in a real browser.",
    ],
    description:
      'Run a Browserbase browser session via the executor (Stagehand Computer-Use agent): optional start URL, then complete the instruction with browser actions. Prefer effort "low" unless the user needs deep exploration; use "medium"/"high" for multi-step or heavy UI tasks. Prefer searchWeb first when you only need links/snippets rather than full page interaction.',
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
      effort: browseEffortSchema
        .default("low")
        .describe(
          "How much browser automation to allow: low (default, fewest steps), medium, or high. The executor caps max steps per tier.",
        ),
      maxSteps: z
        .number()
        .int()
        .positive()
        .max(40)
        .optional()
        .describe(
          "Optional hard cap on agent steps (max 40). If set, the executor uses min(your value, the cap for effort). Prefer setting effort instead.",
        ),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.web.browseWeb.internal.execute,
          {
            instruction: args.instruction,
            startUrl: args.startUrl,
            effort: args.effort ?? "low",
            maxSteps: args.maxSteps,
          },
        ),
      );
    },
  });
}
