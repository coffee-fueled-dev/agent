import { join } from "node:path";
import {
  getFilesystemAgentDbPath,
  isLocalAgentEnabled as readLocalAgentEnabled,
} from "@agent/config";

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function isLocalAgentEnabled(): boolean {
  return readLocalAgentEnabled(process.env);
}

export function getLocalShellSecret(): string {
  return (
    trim(process.env.SHELL_EXECUTOR_SECRET) ?? "dev-only-local-shell-secret"
  );
}

export function getFilesystemDbPath(): string {
  return getFilesystemAgentDbPath(process.env);
}

export function getAgentHomeRoot(): string {
  return join(new URL("../../../../.agent_home", import.meta.url).pathname);
}
