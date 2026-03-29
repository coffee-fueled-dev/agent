import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api";
import { machineActor } from "../../../../eventAttribution";
import { dynamicTool, withFormattedResults } from "../../_libs/toolkit";

declare module "../../registeredToolMap" {
  interface RegisteredToolMap {
    searchContext: InferUITool<Tool>;
  }
}

export function searchContextTool() {
  return dynamicTool({
    telemetry: true,
    name: "searchContext" as const,
    description:
      "Search the user's context entries using hybrid semantic and lexical retrieval.",
    args: z.object({
      query: z.string().describe("Natural language search query"),
      limit: z.number().optional().describe("Max results (default 10)"),
      retrievalMode: z
        .enum(["vector", "lexical", "hybrid"])
        .optional()
        .describe("Retrieval strategy"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const { accountId } = await ctx.runMutation(
            internal.sessionResolve.ensureMachineAccountInternal,
            {
              codeId: ctx.agentId,
              name: ctx.agentName,
            },
          );
          const results = await ctx.runAction(
            internal.context.search.searchContextInternal,
            {
              namespace: ctx.namespace,
              query: args.query,
              limit: args.limit,
              retrievalMode: args.retrievalMode,
              threadId: ctx.threadId,
              session: ctx.sessionId,
              clientSessionId: ctx.sessionId,
              actor: machineActor(accountId),
            },
          );
          return { results };
        })(),
      );
    },
  });
}
