import type { InferUITools } from "ai";
import { contextToolkitForRegistry } from "../../chat/tools";
import type { ToolMapFromRegistry } from "./_libs/toolkit";
import { exampleTool } from "./example/tool";

export { exampleTool } from "./example/tool";

export const toolLibrary = {
  exampleTool,
  contextChat: contextToolkitForRegistry(),
} as const;

export type RegisteredToolSet = ToolMapFromRegistry<typeof toolLibrary>;
export type RegisteredUITools = InferUITools<RegisteredToolSet>;
