import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { searchWebTool } from "./searchWeb/tool.js";

export function webToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([searchWebTool()], {
    name: "web",
    instructions: [
      "Use the internet when you need to find information or perform tasks that require real-world interaction.",
    ],
  });
}
