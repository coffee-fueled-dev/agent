import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { browseWebTool } from "./browseWeb/tool.js";
import { searchWebTool } from "./searchWeb/tool.js";

export function webToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([searchWebTool(), browseWebTool()], {
    name: "web",
  });
}
