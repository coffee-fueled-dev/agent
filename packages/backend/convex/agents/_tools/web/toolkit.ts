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
    instructions: [
      "Prefer searchWeb for discovery (links/snippets); use browseWeb for on-page interaction. For browseWeb, default effort is low—raise effort only for multi-page or heavy UI tasks.",
    ],
  });
}
