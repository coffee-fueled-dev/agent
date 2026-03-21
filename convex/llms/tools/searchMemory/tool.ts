import { z } from "zod/v4";
import { searchThreadOwnerMemories } from "../../chatMemory";
import type { DynamicToolDef, ToolOutput } from "../_libs/toolkit";
import { dynamicTool, withFormattedResults } from "../_libs/toolkit";

export const searchMemoryTool: DynamicToolDef<"searchMemory"> = dynamicTool({
  name: "searchMemory" as const,
  description:
    "Search the thread owner's memory for prior facts, preferences, beliefs, and file references.",
  instructions: [
    "Use `searchMemory` when you need to recall information that may exist outside the current turn instead of guessing from memory.",
    "Treat retrieved memories as fallible evidence. Use them to ground follow-up questions, recall stable facts, and reference file URLs, but do not overstate uncertain memories as certain truth.",
  ],
  args: z.object({
    query: z.string().min(1).describe("What you want to recall from memory."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum number of memories to return. Defaults to 5."),
    vectorScoreThreshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Optional minimum vector score. Defaults to 0.6."),
  }),
  handler: async (
    toolCtx,
    args,
  ): Promise<
    ToolOutput<{
      ownerAccountId: string;
      namespace: string;
      memories: Awaited<
        ReturnType<typeof searchThreadOwnerMemories>
      >["memories"];
    }>
  > => {
    return await withFormattedResults(
      (async () => {
        if (!toolCtx.threadId) {
          throw new Error("searchMemory requires a thread context");
        }

        const { ownerAccountId, namespace, memories } =
          await searchThreadOwnerMemories(toolCtx, {
            threadId: toolCtx.threadId,
            query: args.query,
            limit: args.limit ?? 5,
            searchType: "vector",
            vectorScoreThreshold: args.vectorScoreThreshold ?? 0.6,
          });

        return {
          ownerAccountId,
          namespace,
          memories,
        };
      })(),
    );
  },
});
