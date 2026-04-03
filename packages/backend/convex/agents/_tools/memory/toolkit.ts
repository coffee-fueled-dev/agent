import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { mergeMemoryTool } from "./mergeMemory/tool.js";
import { searchMemoriesTool } from "./searchMemories/tool.js";

const memoryUsage = `Memory tools persist and search session-scoped memories: merge memories into the index, and run hybrid lexical + vector search (RRF).`;

export function memoryToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([mergeMemoryTool(), searchMemoriesTool()], {
    name: "memory",
    instructions: [memoryUsage],
  }) as Composable<
    { kind: string; name: string },
    Record<string, ToolSpec>,
    ConvexAgentEnv
  >;
}
