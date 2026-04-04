import { tool } from "@very-coffee/agent-identity";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api.js";
import { assistantActorPolicy } from "../../../_policies/actorPolicies.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    runShell: InferUITool<Tool>;
  }
}

export function runShellTool() {
  return tool({
    name: "runShell" as const,
    description: "Run a shell command in your dedicated workspace.",
    policies: [assistantActorPolicy],
    inputSchema: inputArgs({
      command: z
        .string()
        .describe("Shell command to run (executor must be wired)."),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      return await withFormattedResults(
        ctx.env.runAction(
          internal.agents._tools.filesystem.runShell.internal.execute,
          {
            command: args.command,
            namespace: ctx.env.namespace,
          },
        ),
      );
    },
  });
}
