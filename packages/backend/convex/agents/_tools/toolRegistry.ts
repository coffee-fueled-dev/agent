import "./registeredToolAugments.js";
import { filesystemToolkit } from "./filesystem/toolkit.js";
import { memoryToolkit } from "./memory/toolkit.js";
import { webToolkit } from "./web/toolkit.js";

export const toolLibrary = {
  filesystem: filesystemToolkit(),
  memory: memoryToolkit(),
  web: webToolkit(),
};
