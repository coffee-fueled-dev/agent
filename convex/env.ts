/**
 * Convex runtime env (V8 + Node actions). Values come from `convex env` / dashboard in
 * production; local dev may mirror `.env.local` via `scripts/dev-convex.ts`.
 */
import { z } from "zod/v4";

const convexEnvSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_SERVER_URL: z.string().optional(),
  BINARY_EMBEDDING_SECRET: z.string().optional(),
  CONVEX_SITE_URL: z.string().optional(),
  CONVEX_URL: z.string().optional(),
  LOCAL_SHELL_URL: z.string().optional(),
  LOCAL_SHELL_SECRET: z.string().optional(),
  LOCAL_AGENT_MODE: z.string().optional(),
  SHELL_COMMAND_WHITELIST: z.string().optional(),
});

const env = convexEnvSchema.parse(process.env);

/** Keys Convex reads from `process.env` — dev sync (`syncShellEnvFromLocal`) only pushes these. */
export const CONVEX_SERVER_ENV_KEYS = Object.keys(
  convexEnvSchema.shape,
) as (keyof typeof convexEnvSchema.shape)[];

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function getGoogleApiKey(): string | undefined {
  return (
    trim(env.GOOGLE_GENERATIVE_AI_API_KEY) ??
    trim(env.GOOGLE_API_KEY) ??
    trim(env.GEMINI_API_KEY)
  );
}

export function getOpenaiApiKey(): string | undefined {
  return trim(env.OPENAI_API_KEY);
}

export function getEmbeddingServerUrl(): string {
  return trim(env.EMBEDDING_SERVER_URL) ?? "http://127.0.0.1:3031";
}

export function getFileEmbeddingSecret(): string {
  return (
    trim(env.BINARY_EMBEDDING_SECRET) ?? "dev-only-binary-embedding-secret"
  );
}

export function getConvexSiteUrl(): string {
  const url = trim(env.CONVEX_SITE_URL) ?? trim(env.CONVEX_URL);
  if (!url) throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
  return url.replace(/\/+$/, "");
}

export function getLocalShellUrl(): string {
  return trim(env.LOCAL_SHELL_URL)?.replace(/\/+$/, "") ?? "";
}

export function getLocalShellSecret(): string {
  return trim(env.LOCAL_SHELL_SECRET) ?? "";
}

export function isLocalAgentMode(): boolean {
  return trim(env.LOCAL_AGENT_MODE) === "true";
}

export function getShellCommandWhitelistRaw(): string | undefined {
  return trim(env.SHELL_COMMAND_WHITELIST);
}
