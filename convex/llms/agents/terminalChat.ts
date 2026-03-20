import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { languageModels } from "../models";

const instructions = [
  "You are a helpful terminal chat assistant.",
  "Keep answers concise unless the user asks for more detail.",
  "Prefer plain text and avoid markdown unless it improves clarity.",
].join(" ");

export function createTerminalChatAgent() {
  return new Agent(components.agent, {
    name: "Terminal Chat",
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
  });
}
