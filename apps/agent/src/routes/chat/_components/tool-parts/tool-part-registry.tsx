import type { RegisteredToolName } from "@very-coffee/backend/types";
import type * as React from "react";
import { AddMemoryToolPart } from "./add-memory-tool-part.js";
import { DeleteMemoryToolPart } from "./delete-memory-tool-part.js";
import { EditMemoryToolPart } from "./edit-memory-tool-part.js";
import { FallbackToolPart } from "./fallback-tool-part.js";
import { RunShellToolPart } from "./run-shell-tool-part.js";
import { SearchMemoryToolPart } from "./search-memory-tool-part.js";
import type { ToolPartProps } from "./types.js";

const registry = {
  addMemory: AddMemoryToolPart,
  deleteMemory: DeleteMemoryToolPart,
  editMemory: EditMemoryToolPart,
  searchMemory: SearchMemoryToolPart,
  runShell: RunShellToolPart,
} satisfies Record<RegisteredToolName, React.ComponentType<ToolPartProps>>;

export function ToolPartView(props: ToolPartProps) {
  const C =
    props.toolName in registry
      ? registry[props.toolName as RegisteredToolName]
      : FallbackToolPart;
  return <C {...props} />;
}
