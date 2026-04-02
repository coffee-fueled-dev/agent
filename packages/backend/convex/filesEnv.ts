import { z } from "zod/v4";

const backendFileEnvSchema = z.object({
  EMBEDDING_SERVER_URL: z.string().optional(),
  BINARY_EMBEDDING_SECRET: z.string().optional(),
});

const env = backendFileEnvSchema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function getEmbeddingServerUrl(): string {
  const url = trim(env.EMBEDDING_SERVER_URL);
  if (!url) throw new Error("EMBEDDING_SERVER_URL is required");
  return url.replace(/\/+$/, "");
}

export function getFileEmbeddingSecret(): string {
  return trim(env.BINARY_EMBEDDING_SECRET) ?? "dev-only-binary-embedding-secret";
}
