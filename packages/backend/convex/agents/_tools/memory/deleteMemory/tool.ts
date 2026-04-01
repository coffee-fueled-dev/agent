import { tool } from "@very-coffee/agent-identity";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    deleteMemory: InferUITool<Tool>;
  }
}

export function deleteMemoryTool() {
  return tool({
    name: "deleteMemory" as const,
    description: "Delete a memory entry by id.",
    inputSchema: z.object({
      entryId: z.string().describe("Entry id to delete"),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.memory.deleteMemory.internal.execute,
          {
            namespace: ctx.namespace ?? ctx.env.namespace,
            entryId: args.entryId,
          },
        ),
      );
    },
  });
}
