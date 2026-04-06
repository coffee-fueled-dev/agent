import { openai } from "@ai-sdk/openai";

export const languageModels = {
  chat: openai.chat("gpt-5.4-nano"),
  textEmbedding: openai.textEmbedding("text-embedding-3-small"),
};
