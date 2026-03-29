import { toolkit } from "../_libs/toolkit";
import usageInstructions from "./_instructions/usage";
import { runShellTool } from "./runShell/tool";

export function filesystemToolkit() {
  return toolkit([runShellTool()], {
    name: "filesystem",
    instructions: [usageInstructions],
  });
}
