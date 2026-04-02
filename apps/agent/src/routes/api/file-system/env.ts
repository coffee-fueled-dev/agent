import { join } from "node:path";

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function isLocalAgentEnabled(): boolean {
  return trim(process.env.LOACL_AGENT) === "true";
}

export function getLocalShellSecret(): string {
  return trim(process.env.LOCAL_SHELL_SECRET) ?? "dev-only-local-shell-secret";
}

export function getFilesystemDbPath(): string {
  return (
    trim(process.env.FILESYSTEM_AGENT_DB) ??
    new URL("../../../../../.sqlite/agent-filesystem.sqlite", import.meta.url)
      .pathname
  );
}

export function getAgentHomeRoot(): string {
  return join(new URL("../../../../../.agent_home", import.meta.url).pathname);
}
