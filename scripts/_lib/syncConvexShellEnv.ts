/**
 * Pushes allowlisted vars from `.env.local` (`vars` from `readRootEnv()`) into the
 * Convex dev deployment via `convex env set`. Keys match [`CONVEX_SERVER_ENV_KEYS`](../convex/env.ts).
 * Production env is still set in the dashboard / CI.
 */
import { CONVEX_SERVER_ENV_KEYS } from "../../convex/env.js";

const allowedConvexEnvKeys = new Set<string>(
  CONVEX_SERVER_ENV_KEYS as string[],
);

export async function syncShellEnvFromLocal(
  cwd: string,
  env: Record<string, string | undefined>,
  vars: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(vars);
  const filtered = entries.filter(([key]) => allowedConvexEnvKeys.has(key));

  if (filtered.length === 0) {
    if (entries.length > 0) {
      console.log(
        `[dev:convex] No allowlisted Convex env vars in .env.local (skipped ${entries.length}; see convex/env.ts CONVEX_SERVER_ENV_KEYS)`,
      );
    } else {
      console.log("[dev:convex] No entries in .env.local to sync to Convex");
    }
    return;
  }

  const skipped = entries.length - filtered.length;
  if (skipped > 0) {
    console.log(
      `[dev:convex] Skipping ${skipped} var(s) not in Convex allowlist`,
    );
  }
  console.log(
    `[dev:convex] Syncing ${filtered.length} env var(s) from .env.local to Convex dev deployment...`,
  );

  for (const [key, value] of filtered) {
    const proc = Bun.spawn(["bunx", "convex", "env", "set", key, value], {
      cwd,
      env,
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    if (code !== 0) {
      console.warn(
        `[dev:convex] convex env set ${key} failed (exit ${code}); is the Convex project configured?`,
      );
    }
  }
}
