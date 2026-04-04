import type { z } from "zod/v4";
import type { shareMemoriesInputSchema } from "../_tools/memory/shareMemories/tool.js";
import type { RegisteredUITools } from "../_tools/registeredToolMap.js";

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

/** Invokable through {@link executeHumanTool} (same as {@link HumanToolkitToolName} for humans). */
export type HumanToolkitExecutableToolName = HumanToolkitToolName;

/** One row from {@link humanToolkitForChat}; `name` preserves the human-tool literal union. */
export type HumanToolkitToolUi = {
  name: HumanToolkitToolName;
  description?: string;
  enabled: boolean;
  policyIds?: string[];
  inputJsonSchema?: unknown;
};
