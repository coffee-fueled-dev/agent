import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    addMemory: InferUITool<Tool>;
  }
}

export function addMemoryTool(): DynamicToolDef<"addMemory", unknown, Tool> {
  return dynamicTool({
    name: "addMemory" as const,
    instructions: [
      "Use addMemory to store memories relevant to the user or to your own experiences.",
    ],
    description: "Create a new memory entry with text (and optional title).",
    args: z.object({
      text: z.string().describe("Body text for the entry"),
      title: z.string().optional().describe("Short title"),
      observationTime: z
        .number()
        .optional()
        .describe("Unix ms observation time"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.memory.addMemory.internal.execute,
            {
              namespace: ctx.namespace,
              text: args.text,
              title: args.title,
              observationTime: args.observationTime,
            },
          );
        })(),
      );
    },
  });
}
