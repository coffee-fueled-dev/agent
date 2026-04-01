import type { InferUITool, Tool } from "ai";
import { tool } from "@very-coffee/agent-identity";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    editMemory: InferUITool<Tool>;
  }
}

export function editMemoryTool() {
  return tool({
    name: "editMemory" as const,
    description: "Update an existing memory entry.",
    inputSchema: z.object({
      entryId: z.string().describe("Entry id to edit"),
      text: z.string().optional().describe("New body text"),
      title: z.string().optional().describe("New title"),
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
        ctx.env.runAction(internal.agents.tools.memory.editMemory.internal.execute, {
          namespace: ctx.namespace ?? ctx.env.namespace,
          entryId: args.entryId,
          text: args.text,
          title: args.title,
          observationTime: args.observationTime,
        }),
      );
    },
  });
}
