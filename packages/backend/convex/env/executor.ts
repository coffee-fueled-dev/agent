import { z } from "zod/v4";

const executorEnvSchema = z.object({
  EXECUTOR_URL: z.string().optional(),
  LOCAL_SHELL_SECRET: z.string().optional(),
  SHELL_EXECUTOR_ENABLED: z.string().optional(),
});

const env = executorEnvSchema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

/** Base URL of the executor HTTP server (shell routes under `/api/fs/*`). */
export function getExecutorBaseUrl(): string {
  return trim(env.EXECUTOR_URL) ?? "http://127.0.0.1:3000";
}

/** POST target for sandboxed shell execution on the executor. */
export function getShellExecutorApiUrl(): string {
  return `${getExecutorBaseUrl().replace(/\/+$/, "")}/api/fs/execute`;
}

export function getLocalShellSecret(): string {
  return trim(env.LOCAL_SHELL_SECRET) ?? "dev-only-local-shell-secret";
}

export function isShellExecutorEnabled(): boolean {
  return trim(env.SHELL_EXECUTOR_ENABLED) === "true";
}
