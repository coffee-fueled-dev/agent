/**
 * Host app Convex env. Components do not reliably receive deployment env; pass keys from
 * the app into component calls (see MemoryClient, agent tools).
 */
import { z } from "zod/v4";

const convexEnvSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

/** Keys to sync to Convex (`npx convex env set`) — used by dev scripts. */
export const CONVEX_SERVER_ENV_KEYS = Object.keys(
  convexEnvSchema.shape,
) as (keyof typeof convexEnvSchema.shape)[];

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function getGoogleApiKey(): string | undefined {
  const e = process.env;
  return (
    trim(e["GOOGLE_GENERATIVE_AI_API_KEY"]) ??
    trim(e["GOOGLE_API_KEY"]) ??
    trim(e["GEMINI_API_KEY"])
  );
}

/** Use when a Google embedding call is required (tools, manual passes). */
export function requireGoogleApiKey(): string {
  const k = getGoogleApiKey();
  if (!k) {
    throw new Error(
      "Missing Google API key: set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) for this Convex deployment (`npx convex env set ...`).",
    );
  }
  return k;
}

export function getOpenaiApiKey(): string | undefined {
  return trim(process.env["OPENAI_API_KEY"]);
}
