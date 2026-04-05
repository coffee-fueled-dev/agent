import { z } from "zod/v4";

/** Field names match tooling URLs/secrets in `convexDashboardEnvSchema` (`@agent/config`). */
const executorEnvSchema = z.object({
  SHELL_EXECUTOR_API_URL: z.string().optional(),
  BROWSER_EXECUTOR_API_URL: z.string().optional(),
  SHELL_EXECUTOR_SECRET: z.string().optional(),
  BROWSER_EXECUTOR_SECRET: z.string().optional(),
  SHELL_EXECUTOR_ENABLED: z.string().optional(),
  /** When true, `automateBrowserTask` POSTs to the browser executor HTTP endpoint. */
  BROWSER_EXECUTOR_ENABLED: z.string().optional(),
});

const env = executorEnvSchema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

function shellExecutorUrlConfigured(): boolean {
  return Boolean(trim(env.SHELL_EXECUTOR_API_URL));
}

function browseExecutorUrlConfigured(): boolean {
  return Boolean(trim(env.BROWSER_EXECUTOR_API_URL));
}

function browseExecutorSecretConfigured(): boolean {
  return Boolean(trim(env.BROWSER_EXECUTOR_SECRET));
}

/** POST target for sandboxed shell execution on the HTTP tooling server. */
export function getShellExecutorApiUrl(): string {
  const u = trim(env.SHELL_EXECUTOR_API_URL);
  if (!u) {
    throw new Error("SHELL_EXECUTOR_API_URL is not set");
  }
  return u;
}

export function getLocalShellSecret(): string {
  return trim(env.SHELL_EXECUTOR_SECRET) ?? "dev-only-local-shell-secret";
}

export function isShellExecutorEnabled(): boolean {
  return (
    trim(env.SHELL_EXECUTOR_ENABLED) === "true" && shellExecutorUrlConfigured()
  );
}

/** POST target for Stagehand / Browserbase browser runs. */
export function getBrowseExecutorApiUrl(): string {
  const u = trim(env.BROWSER_EXECUTOR_API_URL);
  if (!u) {
    throw new Error("BROWSER_EXECUTOR_API_URL is not set");
  }
  return u;
}

/** Bearer token Convex sends to `POST` browser automation; must match the executor’s `BROWSER_EXECUTOR_SECRET`. */
export function getBrowserExecutorSecret(): string {
  const u = trim(env.BROWSER_EXECUTOR_SECRET);
  if (!u) {
    throw new Error("BROWSER_EXECUTOR_SECRET is not set");
  }
  return u;
}

export function isBrowseExecutorEnabled(): boolean {
  return (
    trim(env.BROWSER_EXECUTOR_ENABLED) === "true" &&
    browseExecutorUrlConfigured() &&
    browseExecutorSecretConfigured()
  );
}
