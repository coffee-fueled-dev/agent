import {
  DEFAULT_TOOLING_PUBLIC_HOST,
  DEFAULT_TOOLING_PUBLIC_PORT,
  DEFAULT_TOOLING_PUBLIC_SCHEME,
} from "./defaults.ts";
import { type ExecutorHttpRoutes, executorHttpRoutes } from "./routes.ts";

/**
 * Public base URL for the executor tooling server (shell + browser + embedding HTTP).
 * Prefer `TOOLING_PUBLIC_ORIGIN` when the executor is reachable on a different host than defaults.
 */
export function toolingPublicOriginFromEnv(env: NodeJS.ProcessEnv): string {
  const e = env as Record<string, string | undefined>;
  const direct = e.TOOLING_PUBLIC_ORIGIN?.trim();
  if (direct) return direct.replace(/\/+$/, "");

  const scheme =
    e.TOOLING_PUBLIC_SCHEME?.trim() || DEFAULT_TOOLING_PUBLIC_SCHEME;
  const host = e.TOOLING_PUBLIC_HOST?.trim() || DEFAULT_TOOLING_PUBLIC_HOST;
  const portRaw = e.TOOLING_PUBLIC_PORT?.trim();
  const port = portRaw
    ? Number.parseInt(portRaw, 10)
    : DEFAULT_TOOLING_PUBLIC_PORT;
  if (Number.isNaN(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid TOOLING_PUBLIC_PORT: ${portRaw ?? "(empty)"}`);
  }
  return `${scheme}://${host}:${port}`;
}

/** Full URLs Convex uses for HTTP tooling (`convex env set`). */
export function executorCapabilityUrls(
  origin: string,
  routes: ExecutorHttpRoutes = executorHttpRoutes,
): {
  SHELL_EXECUTOR_API_URL: string;
  BROWSER_EXECUTOR_API_URL: string;
  FILE_EMBEDDING_API_URL: string;
} {
  const o = origin.replace(/\/+$/, "");
  return {
    SHELL_EXECUTOR_API_URL: `${o}${routes.fsExecute}`,
    BROWSER_EXECUTOR_API_URL: `${o}${routes.browserBrowse}`,
    FILE_EMBEDDING_API_URL: `${o}${routes.fileEmbedding}`,
  };
}
