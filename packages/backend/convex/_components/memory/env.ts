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
