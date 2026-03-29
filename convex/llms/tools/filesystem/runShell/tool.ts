import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { components, internal } from "../../../../_generated/api";
import { dynamicTool, withFormattedResults } from "../../_libs/toolkit";
import { localModePolicy } from "../../_policies/localModePolicy";

declare module "../../registeredToolMap" {
  interface RegisteredToolMap {
    runShell: InferUITool<Tool>;
  }
}

export function runShellTool() {
  return dynamicTool({
    telemetry: true,
    name: "runShell" as const,
    policies: [localModePolicy],
    description:
      "Run a shell command on the local machine. Commands are restricted to a safe whitelist.",
    args: z.object({
      command: z
        .string()
        .describe(
          "Single shell command, pipeline, or && / || chain using only whitelisted utilities (e.g. ls, cat, grep).",
        ),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const thread = await ctx.runQuery(
            components.agent.threads.getThread,
            {
              threadId: ctx.threadId,
            },
          );
          const agentId = thread?.userId;
          if (!agentId) {
            throw new Error(
              "Thread has no owner; cannot resolve local shell home",
            );
          }

          return await ctx.runAction(
            internal.llms.tools.filesystem.runShell.shellHttp.executeLocalShell,
            {
              command: args.command,
              agentId,
            },
          );
        })(),
      );
    },
  });
}
