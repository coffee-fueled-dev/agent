import { z } from "zod/v4";
import type { DynamicToolDef, ToolOutput } from "../_libs/toolkit";
import { storeThreadOwnerMemory } from "../../chatMemory";
import { dynamicTool, withFormattedResults } from "../_libs/toolkit";

export const storeMemoryTool: DynamicToolDef<"storeMemory"> = dynamicTool({
  name: "storeMemory" as const,
  description:
    "Store a durable text memory about the user, the assistant, or shared context for future recall.",
  instructions: [
    "Use `storeMemory` sparingly for durable facts that should still matter in future chats, such as stable user preferences, long-lived facts, or useful self-model notes.",
    "Do not store transient turn details, private secrets, credentials, or information that is likely to become stale quickly. Write each memory as a compact standalone statement that will still make sense later.",
  ],
  args: z.object({
    memory: z
      .string()
      .min(1)
      .describe("The durable memory to save as a standalone statement."),
    subject: z
      .enum(["user", "assistant", "shared"])
      .describe("Who the memory is primarily about."),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("Optional short title for the memory."),
  }),
  handler: async (
    toolCtx,
    args,
  ): Promise<
    ToolOutput<{
      ownerAccountId: string;
      namespace: string;
      key: string;
      title: string;
    }>
  > => {
    return await withFormattedResults(
      (async () => {
        if (!toolCtx.threadId) {
          throw new Error("storeMemory requires a thread context");
        }

        const stored = await storeThreadOwnerMemory(toolCtx, {
          threadId: toolCtx.threadId,
          text: args.memory,
          title: args.title,
          subject: args.subject,
        });

        return {
          ownerAccountId: stored.ownerAccountId,
          namespace: stored.namespace,
          key: stored.key,
          title: stored.title,
        };
      })(),
    );
  },
});
