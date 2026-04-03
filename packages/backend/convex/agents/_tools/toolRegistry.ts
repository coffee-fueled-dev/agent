import "./registeredToolAugments.js";
import { filesystemToolkit } from "./filesystem/toolkit.js";
import { memoryToolkit } from "./memory/toolkit.js";

export const toolLibrary = {
  filesystem: filesystemToolkit(),
  memory: memoryToolkit(),
};
