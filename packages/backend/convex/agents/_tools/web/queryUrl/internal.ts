import { GoogleGenAI } from "@google/genai";
import { internalAction } from "_generated/server.js";
import { v } from "convex/values";
import {
  getQueryUrlGeminiModelDefault,
  requireGoogleApiKey,
} from "env/models.js";

const DEFAULT_QUERY_URL_MODEL = "gemini-2.5-flash";

function getQueryUrlModel(override: string | undefined): string {
  const fromEnv = getQueryUrlGeminiModelDefault();
  if (override?.trim()) {
    return override.trim();
  }
  if (fromEnv) {
    return fromEnv;
  }
  return DEFAULT_QUERY_URL_MODEL;
}

export const execute = internalAction({
  args: {
    query: v.string(),
    url: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const apiKey = requireGoogleApiKey();
    const model = getQueryUrlModel(args.model);
    let contents = args.query.trim();
    const u = args.url?.trim();
    if (u) {
      contents += `\n\nUse this page as context (full URL): ${u}`;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        tools: [{ urlContext: {} }, { googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0];
    const usage = response.usageMetadata;

    return {
      text: response.text ?? "",
      model,
      urlContextMetadata: candidate?.urlContextMetadata ?? null,
      groundingMetadata: candidate?.groundingMetadata ?? null,
      usage: usage
        ? {
            promptTokenCount: usage.promptTokenCount,
            candidatesTokenCount: usage.candidatesTokenCount,
            totalTokenCount: usage.totalTokenCount,
            toolUsePromptTokenCount: usage.toolUsePromptTokenCount,
          }
        : null,
    };
  },
});
