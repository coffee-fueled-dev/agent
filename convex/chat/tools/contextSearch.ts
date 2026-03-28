import { z } from "zod/v4";
import { internal } from "../../_generated/api";
import { machineActor } from "../../eventAttribution";
import {
  dynamicTool,
  withFormattedResults,
} from "../../llms/tools/_libs/toolkit";
import { chatAgentDefinition } from "../agent";

export function searchContextTool(namespace: string) {
  return dynamicTool({
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
              codeId: chatAgentDefinition.agentId,
              name: chatAgentDefinition.name,
            },
          );
          const results = await ctx.runAction(
            internal.context.search.searchContextInternal,
            {
              namespace,
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
