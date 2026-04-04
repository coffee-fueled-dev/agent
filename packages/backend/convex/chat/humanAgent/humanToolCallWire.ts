import { v } from "convex/values";
import { zodToConvex } from "convex-helpers/server/zod";
import { shareMemoriesInputSchema } from "../../agents/_tools/memory/shareMemories/tool.js";
import type {
  HumanToolkitToolInputs,
  HumanToolkitToolName,
} from "../../agents/human/humanToolkitTypes.js";

/**
 * Convex args for human tool calls persisted on {@code sendMessage} / internal apply actions.
 * Kept in sync with {@link HumanToolkitToolName} / {@link HumanToolkitToolInputs}.
 */
export const humanToolCallValidator = v.object({
  name: v.literal("shareMemories"),
  input: zodToConvex(shareMemoriesInputSchema),
});

export type HumanToolCall = {
  [K in HumanToolkitToolName]: { name: K; input: HumanToolkitToolInputs[K] };
}[HumanToolkitToolName];

/** Drop shareMemories calls with nothing selected (client should not send them; server safety net). */
export function filterEffectiveHumanToolCalls(
  toolCalls: HumanToolCall[],
): HumanToolCall[] {
  return toolCalls.filter(
    (c) =>
      c.name === "shareMemories" && c.input.selectedMemoryRecordIds.length > 0,
  );
}
