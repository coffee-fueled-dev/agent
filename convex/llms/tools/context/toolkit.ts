import { toolkit } from "../_libs/toolkit";
import contextUsageInstructions from "./_instructions/usage";
import { authoringToolkit } from "./authoring/toolkit";
import { listContextTool } from "./browseContext/tool";
import { searchContextTool } from "./searchContext/tool";

export function contextToolkit() {
  return toolkit([searchContextTool(), authoringToolkit(), listContextTool()], {
    name: "context-management",
    instructions: [contextUsageInstructions],
  });
}
