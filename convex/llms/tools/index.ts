import type { InferUITools } from "ai";
import type { ToolMapFromRegistry } from "./_libs/toolkit";
import { exampleTool } from "./example/tool";
import { searchMemoryTool } from "./searchMemory/tool";
import { storeMemoryTool } from "./storeMemory/tool";

export { exampleTool } from "./example/tool";
export { searchMemoryTool } from "./searchMemory/tool";
export { storeMemoryTool } from "./storeMemory/tool";

export const toolLibrary = {
  exampleTool,
  searchMemoryTool,
  storeMemoryTool,
} as const;

export type RegisteredToolSet = ToolMapFromRegistry<typeof toolLibrary>;
export type RegisteredUITools = InferUITools<RegisteredToolSet>;
