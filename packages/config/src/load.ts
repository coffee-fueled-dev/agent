import {
  DEFAULT_AGENT_LISTEN_HOST,
  DEFAULT_AGENT_LISTEN_PORT,
  DEFAULT_BROWSER_EXECUTOR_ENABLED,
  DEFAULT_EXECUTOR_LISTEN_HOST,
  DEFAULT_EXECUTOR_LISTEN_PORT,
  DEFAULT_SHELL_EXECUTOR_ENABLED,
} from "./defaults.ts";
import {
  executorCapabilityUrls,
  toolingPublicOriginFromEnv,
} from "./derive.ts";
import { type ConvexDashboardEnv, convexDashboardEnvSchema } from "./schema.ts";

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 65_535) {
    throw new Error(`Invalid port: ${raw}`);
  }
  return n;
}

export type MonorepoConfig = {
  agent: { listen: { hostname: string; port: number } };
  executor: { listen: { hostname: string; port: number } };
  toolingPublicOrigin: string;
  capabilityUrls: ReturnType<typeof executorCapabilityUrls>;
  convexDashboard: ConvexDashboardEnv;
  /**
   * `STORAGE_PUBLIC_TUNNEL_ORIGIN=auto` in env: defer setting Convex env until dev starts an ngrok tunnel.
   * Never pass the literal `auto` to Convex.
   */
  deferStoragePublicTunnelOrigin: boolean;
};

/**
 * Single validated view of monorepo env: listen addresses, derived tooling URLs, and Convex dashboard env.
 */
export function loadMonorepoConfig(env: NodeJS.ProcessEnv): MonorepoConfig {
  const e = env as Record<string, string | undefined>;

  const agentListenHost =
    e.AGENT_LISTEN_HOST?.trim() || DEFAULT_AGENT_LISTEN_HOST;
  const agentListenPort = parsePort(
    e.AGENT_LISTEN_PORT,
    DEFAULT_AGENT_LISTEN_PORT,
  );

  const executorListenHost =
    e.EXECUTOR_LISTEN_HOST?.trim() || DEFAULT_EXECUTOR_LISTEN_HOST;
  const executorListenPort = parsePort(
    e.EXECUTOR_LISTEN_PORT,
    DEFAULT_EXECUTOR_LISTEN_PORT,
  );

  const toolingPublicOrigin = toolingPublicOriginFromEnv(env);
  const capabilityUrls = executorCapabilityUrls(toolingPublicOrigin);

  const rawStorageTunnel = e.STORAGE_PUBLIC_TUNNEL_ORIGIN?.trim();
  const deferStoragePublicTunnelOrigin =
    rawStorageTunnel !== undefined && rawStorageTunnel.toLowerCase() === "auto";
  const storageTunnelForConvex = deferStoragePublicTunnelOrigin
    ? undefined
    : rawStorageTunnel === undefined || rawStorageTunnel === ""
      ? undefined
      : rawStorageTunnel;

  const convexDashboard = convexDashboardEnvSchema.parse({
    GOOGLE_GENERATIVE_AI_API_KEY: e.GOOGLE_GENERATIVE_AI_API_KEY,
    OPENAI_API_KEY: e.OPENAI_API_KEY,
    ...capabilityUrls,
    FILE_EMBEDDING_SECRET: e.FILE_EMBEDDING_SECRET,
    SHELL_EXECUTOR_SECRET: e.SHELL_EXECUTOR_SECRET,
    SHELL_EXECUTOR_ENABLED:
      e.SHELL_EXECUTOR_ENABLED?.trim() || DEFAULT_SHELL_EXECUTOR_ENABLED,
    BROWSER_EXECUTOR_SECRET: e.BROWSER_EXECUTOR_SECRET,
    BROWSER_EXECUTOR_ENABLED:
      e.BROWSER_EXECUTOR_ENABLED?.trim() || DEFAULT_BROWSER_EXECUTOR_ENABLED,
    BROWSERBASE_API_KEY: e.BROWSERBASE_API_KEY,
    BROWSERBASE_PROJECT_ID: e.BROWSERBASE_PROJECT_ID,
    QUERY_URL_GEMINI_MODEL: e.QUERY_URL_GEMINI_MODEL,
    STORAGE_PUBLIC_TUNNEL_ORIGIN: storageTunnelForConvex,
    BROWSERBASE_STAGEHAND_CUA_MODEL: e.BROWSERBASE_STAGEHAND_CUA_MODEL,
  });

  return {
    agent: { listen: { hostname: agentListenHost, port: agentListenPort } },
    executor: {
      listen: { hostname: executorListenHost, port: executorListenPort },
    },
    toolingPublicOrigin,
    capabilityUrls,
    convexDashboard,
    deferStoragePublicTunnelOrigin,
  };
}
