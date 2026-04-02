import { z } from "zod/v4";

const backendFileEnvSchema = z.object({
  AGENT_APP_URL: z.string().optional(),
  BINARY_EMBEDDING_SECRET: z.string().optional(),
});

const env = backendFileEnvSchema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function getFileEmbeddingApiUrl(): string {
  const url = trim(env.AGENT_APP_URL) ?? "http://127.0.0.1:3000";
  return `${url.replace(/\/+$/, "")}/api/file-embedding`;
}

export function getFileEmbeddingSecret(): string {
  return (
    trim(env.BINARY_EMBEDDING_SECRET) ?? "dev-only-binary-embedding-secret"
  );
}
