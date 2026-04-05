import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../../lib/customFunctions.js";
import { toolkit } from "../../lib/toolkit.js";
import { browseWebTool } from "./browseWeb/tool.js";
import { queryUrlTool } from "./queryUrl/tool.js";
import { searchWebTool } from "./searchWeb/tool.js";

export function webToolkit(): Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  ConvexAgentEnv
> {
  return toolkit([searchWebTool(), queryUrlTool(), browseWebTool()], {
    name: "web",
    instructions: [
      "Prefer searchWeb for raw search results; use queryUrl for answers grounded with Google Search + optional public URL content (cheaper than browseWeb). Use browseWeb only for real browser interaction. For browseWeb, default effort is low—raise effort only for multi-page or heavy UI tasks.",
    ],
  });
}
