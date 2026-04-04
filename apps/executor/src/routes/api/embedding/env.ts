function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function getConvexUrl(): string {
  const url =
    trim(process.env.CONVEX_URL) ?? trim(process.env.BUN_PUBLIC_CONVEX_URL);
  if (!url) throw new Error("CONVEX_URL is required");
  return url.replace(/\/+$/, "");
}

export function getFileEmbeddingSecret(): string {
  return (
    trim(process.env.BINARY_EMBEDDING_SECRET) ??
    "dev-only-binary-embedding-secret"
  );
}

export function getEmbeddingCacheDbPath(): string {
  return (
    trim(process.env.EMBEDDING_CACHE_DB) ?? ".sqlite/embedding-cache.sqlite"
  );
}

export function getGoogleApiKey(): string | undefined {
  return (
    trim(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ??
    trim(process.env.GOOGLE_API_KEY) ??
    trim(process.env.GEMINI_API_KEY)
  );
}

export function getTempDir(): string {
  return trim(process.env.TMPDIR)?.replace(/\/+$/, "") ?? "/tmp";
}
