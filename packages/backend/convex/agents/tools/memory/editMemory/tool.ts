import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    editMemory: InferUITool<Tool>;
  }
}

export function editMemoryTool(): DynamicToolDef<"editMemory", unknown, Tool> {
  return dynamicTool({
    name: "editMemory" as const,
    description: "Update an existing memory entry.",
    args: z.object({
      entryId: z.string().describe("Entry id to edit"),
      text: z.string().optional().describe("New body text"),
      title: z.string().optional().describe("New title"),
      observationTime: z
        .number()
        .optional()
        .describe("Unix ms observation time"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.memory.editMemory.internal.execute,
            {
              namespace: ctx.namespace,
              entryId: args.entryId,
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
