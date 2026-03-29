import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api";
import { dynamicTool, withFormattedResults } from "../../_libs/toolkit";

declare module "../../registeredToolMap" {
  interface RegisteredToolMap {
    listContext: InferUITool<Tool>;
  }
}

const PAGE_SIZE = 20;

export function listContextTool() {
  return dynamicTool({
    telemetry: true,
    name: "listContext" as const,
    description:
      "List context entries in the user's namespace (paginated). Use cursor from a previous page for more.",
    args: z.object({
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from prior listContext result"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          return await ctx.runQuery(
            internal.context.list.listContextWithFiles,
            {
              namespace: ctx.namespace,
              paginationOpts: {
                cursor: args.cursor ?? null,
                numItems: PAGE_SIZE,
              },
            },
          );
        })(),
      );
    },
  });
}
