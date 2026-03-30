/**
 * @agent/embedding-server — loaded via root `bun --env-file=.env.local` and optional
 * `bun --env-file=apps/embedding-server/.env.local` (see root package.json).
 */
import { z } from "zod/v4";

const embeddingServerEnvSchema = z.object({
  EMBEDDING_SERVER_PORT: z.string().optional(),
  CONVEX_SITE_URL: z.string().optional(),
  CONVEX_URL: z.string().optional(),
  BINARY_EMBEDDING_SECRET: z.string().optional(),
  EMBEDDING_CACHE_DB: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  TMPDIR: z.string().optional(),
});

const env = embeddingServerEnvSchema.parse(process.env);

export const port = Number(env.EMBEDDING_SERVER_PORT ?? "3031");

export function getConvexBaseUrl(): string {
  const url = env.CONVEX_SITE_URL?.trim() || env.CONVEX_URL?.trim();
  if (!url) throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
  return url;
}

export const sharedSecret =
  env.BINARY_EMBEDDING_SECRET?.trim() ?? "dev-only-binary-embedding-secret";

export const cacheDbPath =
  env.EMBEDDING_CACHE_DB ?? ".sqlite/embedding-cache.sqlite";

export function getGoogleApiKey(): string | undefined {
  return (
    env.GOOGLE_GENERATIVE_AI_API_KEY ?? env.GOOGLE_API_KEY ?? env.GEMINI_API_KEY
  );
}

export function getTempDir(): string {
  return env.TMPDIR?.replace(/\/+$/, "") || "/tmp";
}
