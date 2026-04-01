import type { Composable } from "../../lib/toolkit.js";
import { toolkit } from "../../lib/toolkit.js";
import { addMemoryTool } from "./addMemory/tool.js";
import { deleteMemoryTool } from "./deleteMemory/tool.js";
import { editMemoryTool } from "./editMemory/tool.js";
import { listMemoryTool } from "./listMemory/tool.js";
import { searchMemoryTool } from "./searchMemory/tool.js";

const memoryUsage = `Memory tools let you search, list, add, edit, and delete stored memories for this thread namespace.`;

export function memoryToolkit(): Composable {
  return toolkit(
    [
      searchMemoryTool(),
      listMemoryTool(),
      addMemoryTool(),
      editMemoryTool(),
      deleteMemoryTool(),
    ],
    {
      name: "memory",
      instructions: [memoryUsage],
    },
  );
}
