import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import type { DynamicToolDef } from "../../../lib/toolkit.js";
import { dynamicTool, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    runShell: InferUITool<Tool>;
  }
}

export function runShellTool(): DynamicToolDef<"runShell", unknown, Tool> {
  return dynamicTool({
    name: "runShell" as const,
    description:
      "Run a shell command on the local machine (when executor is configured).",
    args: z.object({
      command: z
        .string()
        .describe("Shell command to run (executor must be wired)."),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runAction(
            internal.agents.tools.filesystem.runShell.internal.execute,
            { command: args.command },
          );
        })(),
      );
    },
  });
}
