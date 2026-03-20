import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { defineRegisteredMachineAgent } from "../identity";
import { languageModels } from "../models";

const instructions = [
  "You are a helpful terminal chat assistant.",
  "Keep answers concise unless the user asks for more detail.",
  "Prefer plain text and avoid markdown unless it improves clarity.",
].join(" ");

export const terminalChatAgentDefinition = defineRegisteredMachineAgent({
  agentId: "terminal-chat",
  name: "Terminal Chat",
  staticProps: {
    kind: "agent",
    name: "terminalChat",
    instructions,
    tools: [],
  },
});

export function createTerminalChatAgent() {
  return new Agent(components.agent, {
    name: terminalChatAgentDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
  });
}
