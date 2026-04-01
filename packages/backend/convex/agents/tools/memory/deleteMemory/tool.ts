import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    deleteMemory: InferUITool<Tool>;
  }
}

export function deleteMemoryTool(): DynamicToolDef<
  "deleteMemory",
  unknown,
  Tool
> {
  return dynamicTool({
    name: "deleteMemory" as const,
    description: "Delete a memory entry by id.",
    args: z.object({
      entryId: z.string().describe("Entry id to delete"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.memory.deleteMemory.internal.execute,
            {
              namespace: ctx.namespace,
              entryId: args.entryId,
            },
          );
        })(),
      );
    },
  });
}
