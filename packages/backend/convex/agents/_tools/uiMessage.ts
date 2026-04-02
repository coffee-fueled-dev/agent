import type { UIMessage as BaseUIMessage } from "@convex-dev/agent";
import type { UIDataTypes } from "ai";
import type { RegisteredUITools } from "./registeredToolMap.js";

export type UIMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
> = BaseUIMessage<METADATA, DATA_PARTS, RegisteredUITools>;

export type UITools = RegisteredUITools;

export type { RegisteredToolName } from "./registeredToolMap.js";
