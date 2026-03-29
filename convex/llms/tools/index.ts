import "./registeredToolAugments";
import type { RegisteredToolMap, RegisteredUITools } from "./registeredToolMap";
import {
  contextComposable,
  filesystemComposable,
} from "./toolRegistryInstances";

export type { RegisteredUITools };
export type RegisteredToolSet = RegisteredToolMap;

export const toolLibrary = {
  contextManagement: contextComposable,
  filesystem: filesystemComposable,
} as const;
