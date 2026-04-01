import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    listMemory: InferUITool<Tool>;
  }
}

export function listMemoryTool(): DynamicToolDef<"listMemory", unknown, Tool> {
  return dynamicTool({
    name: "listMemory" as const,
    description:
      "List memory entries in the namespace (paginated). Use cursor from a previous page for more.",
    args: z.object({
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from prior listMemory result"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.memory.listMemory.internal.execute,
            {
              namespace: ctx.namespace,
              cursor: args.cursor,
            },
          );
        })(),
      );
    },
  });
}
