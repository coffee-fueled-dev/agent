import { policy } from "@very-coffee/agent-identity";
import type { ConvexAgentEnv } from "../lib/customFunctions.js";

export const ASSISTANT_AGENT_ID = "assistant";

/** Shell / filesystem tools: only the LLM assistant may invoke them. */
export const assistantActorPolicy = policy<ConvexAgentEnv>(
  "actor-assistant",
  async (env) => env.agentId === ASSISTANT_AGENT_ID,
);
