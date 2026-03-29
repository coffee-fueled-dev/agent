import { createAgent } from "./assistant/agent";
import { exampleAgent } from "./exampleAgent/agent";

export const agentLibrary = {
  assistant: createAgent,
  exampleAgent,
} as const;
