/**
 * Combined monorepo env shape for `process.env` / `Bun.env` (see
 * https://bun.com/docs/runtime/environment-variables#typescript ).
 * Import this file once from entrypoints (e.g. `scripts/dev.ts`) so augmentation applies.
 */
export {};

declare module "bun" {
  interface Env {
    // Convex / tooling (shared)
    CONVEX_DEPLOYMENT?: string;
    CONVEX_URL?: string;
    CONVEX_SITE_URL?: string;
    NODE_ENV?: string;

    // apps/backend (convex env + secrets)
    GOOGLE_GENERATIVE_AI_API_KEY: string;
    OPENAI_API_KEY: string;
    EMBEDDING_SERVER_URL: string;
    BINARY_EMBEDDING_SECRET: string;
    EXECUTOR_URL: string;
    LOCAL_SHELL_SECRET: string;
    SHELL_EXECUTOR_ENABLED: string;
    BROWSER_EXECUTOR_ENABLED: string;
    BROWSERBASE_API_KEY: string;
    BROWSERBASE_PROJECT_ID: string;
    QUERY_URL_GEMINI_MODEL?: string;
    STORAGE_PUBLIC_TUNNEL_ORIGIN?: string;
    BROWSERBASE_STAGEHAND_CUA_MODEL?: string;

    // apps/agent
    BUN_PUBLIC_CONVEX_URL: string;
    BUN_PUBLIC_ACCOUNT_TOKEN: string;

    // Local HTTP ports for `bun run dev` (mapped to each app’s `PORT` in scripts/dev.ts)
    APPS_AGENT_PORT?: string;
    APPS_EXECUTOR_PORT?: string;
    /** Reserved if the backend app ever exposes a dev HTTP port from env */
    APPS_BACKEND_PORT?: string;
  }
}
