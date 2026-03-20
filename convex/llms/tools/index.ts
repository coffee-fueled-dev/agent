import type { InferUITools } from "ai";
import type { ToolMapFromRegistry } from "./_libs/toolkit";
import { exampleTool } from "./example/tool";

export { exampleTool } from "./example/tool";

export const toolLibrary = {
  exampleTool,
} as const;

export type RegisteredToolSet = ToolMapFromRegistry<typeof toolLibrary>;
export type RegisteredUITools = InferUITools<RegisteredToolSet>;
