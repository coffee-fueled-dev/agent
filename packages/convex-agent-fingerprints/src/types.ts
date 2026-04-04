/**
 * Re-export Convex component API typing for apps that wire `components.agentFingerprints`.
 */

export type {
  RegisteredAgentIdentity,
  ToolSpec,
} from "@very-coffee/agent-identity";
export type { ComponentApi } from "./component/_generated/component.js";
