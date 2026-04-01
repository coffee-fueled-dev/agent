import type { InferUITool, Tool } from "ai";
import { tool } from "@very-coffee/agent-identity";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    listMemory: InferUITool<Tool>;
  }
}

export function listMemoryTool() {
  return tool({
    name: "listMemory" as const,
    description:
      "List memory entries in the namespace (paginated). Use cursor from a previous page for more.",
    inputSchema: z.object({
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from prior listMemory result"),
    }),
    handler: async (
      ctx: ToolRuntimeContext<ConvexAgentEnv>,
      args,
    ) => {
      return await withFormattedResults(
        ctx.env.runAction(internal.agents.tools.memory.listMemory.internal.execute, {
          namespace: ctx.namespace ?? ctx.env.namespace,
          cursor: args.cursor,
        }),
      );
    },
  });
}
