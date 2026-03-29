import { createAgent as assistant } from "./assistant/agent";
import { createAgent as exampleAgent } from "./exampleAgent/agent";

export const agentLibrary = {
  assistant,
  exampleAgent,
} as const;
