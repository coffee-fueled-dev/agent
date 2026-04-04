import { v } from "convex/values";
import { zodToConvex } from "convex-helpers/server/zod";
import type { z } from "zod/v4";
import { shareMemoriesInputSchema } from "../agents/_tools/memory/shareMemories/tool.js";

export const humanToolCallValidator = v.object({
  name: v.literal("shareMemories"),
  input: zodToConvex(shareMemoriesInputSchema),
});

export type HumanToolCall = {
  name: "shareMemories";
  input: z.infer<typeof shareMemoriesInputSchema>;
};

/** Drop shareMemories calls with nothing selected (client should not send them; server safety net). */
export function filterEffectiveHumanToolCalls(
  toolCalls: HumanToolCall[],
): HumanToolCall[] {
  return toolCalls.filter(
    (c) => c.input.selectedMemoryRecordIds.length > 0,
  );
}
