import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { runShellTool } from "./runShell/tool.js";

export function filesystemToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([runShellTool()], {
    name: "filesystem",
    instructions: [
      `You can use the filesystem tool to run commands in a dedicated workspace.
    This is useful for tasks that require you to interact with the file system, such as:
    - Searching for files
    - Creating files
    - Deleting files
    - Moving files
    - Renaming files
    - Copying files
    
    You can also use this to organize data for later recollection when that data is necessarily modelled as a file system.`,
    ],
  });
}
