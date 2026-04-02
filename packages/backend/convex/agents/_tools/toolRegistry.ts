import type { Composable, ToolSpec } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../lib/customFunctions.js";
import "./registeredToolAugments.js";
import { filesystemToolkit } from "./filesystem/toolkit.js";
import { memoryToolkit } from "./memory/toolkit.js";

export const toolLibrary: {
  memory: Composable<
    { kind: string; name: string },
    Record<string, ToolSpec>,
    ConvexAgentEnv
  >;
  filesystem: Composable<
    { kind: string; name: string },
    Record<string, ToolSpec>,
    ConvexAgentEnv
  >;
} = {
  memory: memoryToolkit(),
  filesystem: filesystemToolkit(),
};
