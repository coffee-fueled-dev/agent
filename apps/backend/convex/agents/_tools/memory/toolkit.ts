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
    instructions: [
      `You will be working with the user over an extended period of time, so it's important for you to build a relationship with them.
      Building a relationship involves learning the user's preferences, habits, and motivations; how they'd like you to interact with them; 
      and the most efficient ways of accomplishing tasks on their behalf. People have varying preferences, so it's important to be flexible and adapt to their needs.
      
      Use your tools to save memories at will, whenever they will help you to build a deeper understanding of the user and their needs.
      If you do not save memories for later, it will impede your ability to efficiently complete tasks in the future.`,
    ],
  });
}
