import type { InferUITool, Tool } from "ai";
import { tool } from "@very-coffee/agent-identity";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    addMemory: InferUITool<Tool>;
  }
}

export function addMemoryTool() {
  return tool({
    name: "addMemory" as const,
    instructions: [
      "Use addMemory to store memories relevant to the user or to your own experiences.",
    ],
    description: "Create a new memory entry with text (and optional title).",
    inputSchema: z.object({
      text: z.string().describe("Body text for the entry"),
      title: z.string().optional().describe("Short title"),
      observationTime: z
        .number()
        .optional()
        .describe("Unix ms observation time"),
    }),
    handler: async (
      ctx: ToolRuntimeContext<ConvexAgentEnv>,
      args,
    ) => {
      return await withFormattedResults(
        ctx.env.runAction(internal.agents.tools.memory.addMemory.internal.execute, {
          namespace: ctx.namespace ?? ctx.env.namespace,
          text: args.text,
          title: args.title,
          observationTime: args.observationTime,
        }),
      );
    },
  });
}
