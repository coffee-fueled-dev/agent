import { tool } from "@very-coffee/agent-identity";
import { internal } from "_generated/api.js";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    shareMemories: InferUITool<Tool>;
  }
}

export const shareMemoriesInputSchema = z.object({
  seenMemoryRecordIds: z
    .array(z.string())
    .describe("All memory records that were provided to select from."),
  selectedMemoryRecordIds: z
    .array(z.string())
    .describe("The memory records that were chosen to share."),
});

export function shareMemoriesTool() {
  return tool({
    name: "shareMemories" as const,
    description: "Choose memory records to share with another agent.",
    inputSchema: shareMemoriesInputSchema,
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      return await withFormattedResults(
        ctx.env.runAction(internal.chat.resolveMemories.resolveMemoriesAction, {
          namespace: ctx.env.namespace,
          memoryRecordIds: args.selectedMemoryRecordIds,
        }),
      );
    },
  });
}
