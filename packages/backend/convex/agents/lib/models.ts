import { openai } from "@ai-sdk/openai";

export const languageModels = {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.textEmbedding("text-embedding-3-small"),
};
