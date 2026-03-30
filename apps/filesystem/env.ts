/**
 * @agent/filesystem — loaded via root `bun --env-file=.env.local` and optional
 * `bun --env-file=apps/filesystem/.env.local` (see root package.json).
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod/v4";

const filesystemEnvSchema = z.object({
  FILESYSTEM_PORT: z.string().optional(),
  LOCAL_SHELL_PORT: z.string().optional(),
  FILESYSTEM_HOST: z.string().optional(),
  LOCAL_SHELL_SECRET: z.string().optional(),
  NODE_ENV: z.string().optional(),
  FILESYSTEM_AGENT_DB: z.string().optional(),
  LOCAL_SHELL_HOME_ROOT: z.string().optional(),
});

const env = filesystemEnvSchema.parse(process.env);

export const port = Number(
  env.FILESYSTEM_PORT ?? env.LOCAL_SHELL_PORT ?? "3941",
);

export const hostname = env.FILESYSTEM_HOST ?? "127.0.0.1";

export const secret =
  env.LOCAL_SHELL_SECRET?.trim() ??
  (env.NODE_ENV !== "production" ? "dev-only-local-shell-secret" : "");

export const dbPath =
  env.FILESYSTEM_AGENT_DB ?? ".sqlite/agent-filesystem.sqlite";

export const homeRoot =
  env.LOCAL_SHELL_HOME_ROOT?.trim() ??
  join(homedir(), ".cache", "agent-filesystem", "homes");
