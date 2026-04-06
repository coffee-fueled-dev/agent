/**
 * Field names match tooling URLs/secrets in `convexDashboardEnvSchema` (`@agent/config`).
 * `SHELL_EXECUTOR_SECRET` and `BROWSER_EXECUTOR_SECRET` must match the executor process env vars of the same names.
 *
 * All reads are at call time so `convex env set` updates take effect immediately.
 */

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function getShellExecutorApiUrl(): string {
  const u = trim(process.env.SHELL_EXECUTOR_API_URL);
  if (!u) {
    throw new Error("SHELL_EXECUTOR_API_URL is not set");
  }
  return u;
}

export function getLocalShellSecret(): string {
  return trim(process.env.SHELL_EXECUTOR_SECRET) ?? "dev-only-local-shell-secret";
}

export function isShellExecutorEnabled(): boolean {
  return (
    trim(process.env.SHELL_EXECUTOR_ENABLED) === "true" &&
    Boolean(trim(process.env.SHELL_EXECUTOR_API_URL))
  );
}

export function getBrowseExecutorApiUrl(): string {
  const u = trim(process.env.BROWSER_EXECUTOR_API_URL);
  if (!u) {
    throw new Error("BROWSER_EXECUTOR_API_URL is not set");
  }
  return u;
}

export function getBrowserExecutorSecret(): string {
  const u = trim(process.env.BROWSER_EXECUTOR_SECRET);
  if (!u) {
    throw new Error("BROWSER_EXECUTOR_SECRET is not set");
  }
  return u;
}

export function isBrowseExecutorEnabled(): boolean {
  return (
    trim(process.env.BROWSER_EXECUTOR_ENABLED) === "true" &&
    Boolean(trim(process.env.BROWSER_EXECUTOR_API_URL)) &&
    Boolean(trim(process.env.BROWSER_EXECUTOR_SECRET))
  );
}
