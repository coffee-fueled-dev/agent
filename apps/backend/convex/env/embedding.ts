/**
 * Matches `FILE_EMBEDDING_*` in `convexDashboardEnvSchema` (`@agent/config`).
 * `FILE_EMBEDDING_SECRET` must match the executor's `FILE_EMBEDDING_SECRET` (header `x-binary-embedding-secret`).
 *
 * All reads are at call time so `convex env set` updates take effect immediately.
 */

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function isFileEmbeddingApiConfigured(): boolean {
  return Boolean(trim(process.env.FILE_EMBEDDING_API_URL));
}

export function getFileEmbeddingApiUrl(): string {
  const u = trim(process.env.FILE_EMBEDDING_API_URL);
  if (!u) {
    throw new Error("FILE_EMBEDDING_API_URL is not set");
  }
  return u;
}

export function getFileEmbeddingSecret(): string {
  return trim(process.env.FILE_EMBEDDING_SECRET) ?? "dev-only-binary-embedding-secret";
}
