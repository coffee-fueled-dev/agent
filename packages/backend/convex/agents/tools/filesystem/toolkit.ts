import type { Composable } from "../../lib/toolkit.js";
import { toolkit } from "../../lib/toolkit.js";
import { runShellTool } from "./runShell/tool.js";

const fsUsage = `Filesystem tools run host commands when a shell executor is available.`;

export function filesystemToolkit(): Composable {
  return toolkit([runShellTool()], {
    name: "filesystem",
    instructions: [fsUsage],
  });
}
