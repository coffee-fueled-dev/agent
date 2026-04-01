import type { Composable } from "../lib/toolkit.js";
import "./registeredToolAugments.js";
import { filesystemToolkit } from "./filesystem/toolkit.js";
import { memoryToolkit } from "./memory/toolkit.js";

export const toolLibrary: {
  memory: Composable;
  filesystem: Composable;
} = {
  memory: memoryToolkit(),
  filesystem: filesystemToolkit(),
};
