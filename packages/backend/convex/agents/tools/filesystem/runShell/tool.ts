import type { InferUITool, Tool } from "ai";
import { tool } from "@very-coffee/agent-identity";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    runShell: InferUITool<Tool>;
  }
}

export function runShellTool() {
  return tool({
    name: "runShell" as const,
    description:
      "Run a shell command on the local machine (when executor is configured).",
    inputSchema: z.object({
      command: z
        .string()
        .describe("Shell command to run (executor must be wired)."),
    }),
    handler: async (
      ctx: ToolRuntimeContext<ConvexAgentEnv>,
      args,
    ) => {
      return await withFormattedResults(
        ctx.env.runAction(internal.agents.tools.filesystem.runShell.internal.execute, {
          command: args.command,
        }),
      );
    },
  });
}
