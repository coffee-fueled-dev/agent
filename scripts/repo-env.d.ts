export {};

declare module "bun" {
  interface Env {
    // Convex CLI / local deployment (often written by convex dev script)
    CONVEX_DEPLOYMENT?: string;
    CONVEX_URL?: string;
    CONVEX_SITE_URL?: string;
    NODE_ENV?: string;

    // Convex dashboard env — secrets pushed via scripts/convex.ts (convex env set)
    GOOGLE_GENERATIVE_AI_API_KEY: string;
    OPENAI_API_KEY: string;
    FILE_EMBEDDING_SECRET: string;
    SHELL_EXECUTOR_SECRET: string;
    BROWSER_EXECUTOR_SECRET: string;
    BROWSERBASE_API_KEY: string;
    BROWSERBASE_PROJECT_ID: string;

    // Agent UI (inlined at dev/build)
    BUN_PUBLIC_CONVEX_URL: string;
    BUN_PUBLIC_ACCOUNT_TOKEN: string;

    // Monorepo listen overrides (@agent/config)
    AGENT_LISTEN_HOST?: string;
    AGENT_LISTEN_PORT?: string;
    EXECUTOR_LISTEN_HOST?: string;
    EXECUTOR_LISTEN_PORT?: string;

    // Public executor origin for Convex → HTTP tooling
    TOOLING_PUBLIC_ORIGIN?: string;
    TOOLING_PUBLIC_SCHEME?: string;
    TOOLING_PUBLIC_HOST?: string;
    TOOLING_PUBLIC_PORT?: string;

    // Convex feature flags (string "true" / "false")
    SHELL_EXECUTOR_ENABLED?: string;
    BROWSER_EXECUTOR_ENABLED?: string;
    QUERY_URL_GEMINI_MODEL?: string;
    STORAGE_PUBLIC_TUNNEL_ORIGIN?: string;
    BROWSERBASE_STAGEHAND_CUA_MODEL?: string;

    // Executor local paths / behavior
    FILESYSTEM_AGENT_DB?: string;
    EMBEDDING_CACHE_DB?: string;
    LOCAL_AGENT?: string;

    // ngrok when STORAGE_PUBLIC_TUNNEL_ORIGIN=auto (`scripts/storageTunnel.ts`)
    NGROK_AUTHTOKEN?: string;
    NGROK_DOMAIN?: string;
    STORAGE_TUNNEL_UPSTREAM?: string;
  }
}
