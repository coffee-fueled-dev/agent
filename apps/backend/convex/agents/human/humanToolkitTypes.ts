import type { z } from "zod/v4";
import type { shareMemoriesInputSchema } from "../_tools/memory/shareMemories/tool.js";
import type { RegisteredUITools } from "../_tools/registeredToolMap.js";

/** Default `goal` when the UI builds `shareMemories` tool calls without user-authored intent text. */
export const DEFAULT_SHARE_MEMORIES_GOAL =
  "Share memories with the assistant" as const;

/** Only human tool: share selected memories with the thread / assistant. */
export type HumanToolkitRegisteredTools = Pick<
  RegisteredUITools,
  "shareMemories"
>;

export type HumanToolkitToolName = keyof HumanToolkitRegisteredTools;

/** Input payload per tool name (keep in sync with each tool's `inputSchema`). */
export type HumanToolkitToolInputs = {
  shareMemories: z.infer<typeof shareMemoriesInputSchema>;
};

/** Executable tool names for the human role (same as {@link HumanToolkitToolName} today). */
export type HumanToolkitExecutableToolName = HumanToolkitToolName;

/** One affordance row from the server-driven human toolkit UI; `name` matches {@link HumanToolkitToolName}. */
export type HumanToolkitToolUi = {
  name: HumanToolkitToolName;
  description?: string;
  enabled: boolean;
  policyIds?: string[];
  inputJsonSchema?: unknown;
};
