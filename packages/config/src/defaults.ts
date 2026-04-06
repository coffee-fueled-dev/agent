/** Default HTTP listen (agent dev UI). */
export const DEFAULT_AGENT_LISTEN_HOST = "127.0.0.1";
export const DEFAULT_AGENT_LISTEN_PORT = 3000;

/** Default HTTP listen (executor tooling server). */
export const DEFAULT_EXECUTOR_LISTEN_HOST = "127.0.0.1";
export const DEFAULT_EXECUTOR_LISTEN_PORT = 3010;

/** Used when `TOOLING_PUBLIC_ORIGIN` is unset: Convex and scripts reach the executor at this origin. */
export const DEFAULT_TOOLING_PUBLIC_SCHEME = "http";
export const DEFAULT_TOOLING_PUBLIC_HOST = "127.0.0.1";
export const DEFAULT_TOOLING_PUBLIC_PORT = 3010;

/** Convex dashboard string env defaults (feature flags). */
export const DEFAULT_SHELL_EXECUTOR_ENABLED = "true";
export const DEFAULT_BROWSER_EXECUTOR_ENABLED = "true";

/** Paths relative to executor cwd when env overrides are unset. */
export const DEFAULT_FILESYSTEM_AGENT_DB = ".sqlite/agent-filesystem.sqlite";
export const DEFAULT_EMBEDDING_CACHE_DB = ".sqlite/embedding-cache.sqlite";
