import {
  DEFAULT_EMBEDDING_CACHE_DB,
  DEFAULT_FILESYSTEM_AGENT_DB,
} from "./defaults.ts";

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function getFilesystemAgentDbPath(env: NodeJS.ProcessEnv): string {
  return (
    trim((env as Record<string, string | undefined>).FILESYSTEM_AGENT_DB) ??
    DEFAULT_FILESYSTEM_AGENT_DB
  );
}

export function getEmbeddingCacheDbPath(env: NodeJS.ProcessEnv): string {
  return (
    trim((env as Record<string, string | undefined>).EMBEDDING_CACHE_DB) ??
    DEFAULT_EMBEDDING_CACHE_DB
  );
}

/**
 * When unset, defaults to enabled (previous committed `localAgent: true`).
 */
export function isLocalAgentEnabled(env: NodeJS.ProcessEnv): boolean {
  const e = env as Record<string, string | undefined>;
  const v = trim(e.LOCAL_AGENT) ?? trim(e.LOACL_AGENT);
  if (v === "true") return true;
  if (v === "false") return false;
  return true;
}
