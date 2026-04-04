import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { runShellTool } from "./runShell/tool.js";

const fsUsage = `Filesystem tools run commands in a dedicated workspace.`;

export function filesystemToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([runShellTool()], {
    name: "filesystem",
    instructions: [fsUsage],
  });
}
