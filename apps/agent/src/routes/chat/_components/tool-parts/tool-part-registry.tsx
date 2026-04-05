import type { RegisteredToolName } from "@very-coffee/backend/types";
import type * as React from "react";
import { BrowseWebToolPart } from "./browse-web-tool-part.js";
import { FallbackToolPart } from "./fallback-tool-part.js";
import { MergeMemoryToolPart } from "./merge-memory-tool-part.js";
import { RunShellToolPart } from "./run-shell-tool-part.js";
import { SearchMemoryToolPart } from "./search-memory-tool-part.js";
import { SearchWebToolPart } from "./search-web-tool-part.js";
import { ShareMemoriesToolPart } from "./share-memories-tool-part.js";
import type { ToolPartProps } from "./types.js";

const registry = {
  mergeMemory: MergeMemoryToolPart,
  searchMemories: SearchMemoryToolPart,
  shareMemories: ShareMemoriesToolPart,
  runShell: RunShellToolPart,
  searchWeb: SearchWebToolPart,
  browseWeb: BrowseWebToolPart,
} satisfies Record<RegisteredToolName, React.ComponentType<ToolPartProps>>;

export function ToolPartView(props: ToolPartProps) {
  const C =
    props.toolName in registry
      ? registry[props.toolName as RegisteredToolName]
      : FallbackToolPart;
  return <C {...props} />;
}
