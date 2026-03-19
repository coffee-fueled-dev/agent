import { openai } from "@ai-sdk/openai";

export const languageModels = {
  chat: openai.chat("gpt-5.2"),
  quickDecisions: openai.chat("gpt-4.1-nano"),
  textEmbedding: openai.textEmbedding("text-embedding-3-small"),
};
