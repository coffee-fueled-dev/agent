import { z } from "zod/v4";

/** Matches `FILE_EMBEDDING_*` in `convexDashboardEnvSchema` (`@agent/config`). */
const backendFileEnvSchema = z.object({
  FILE_EMBEDDING_API_URL: z.string().optional(),
  FILE_EMBEDDING_SECRET: z.string().optional(),
});

const env = backendFileEnvSchema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

/** True when Convex has a configured file-embedding HTTP endpoint. */
export function isFileEmbeddingApiConfigured(): boolean {
  return Boolean(trim(env.FILE_EMBEDDING_API_URL));
}

export function getFileEmbeddingApiUrl(): string {
  const u = trim(env.FILE_EMBEDDING_API_URL);
  if (!u) {
    throw new Error("FILE_EMBEDDING_API_URL is not set");
  }
  return u;
}

export function getFileEmbeddingSecret(): string {
  return trim(env.FILE_EMBEDDING_SECRET) ?? "dev-only-binary-embedding-secret";
}
