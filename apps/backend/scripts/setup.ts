#!/usr/bin/env bun
/**
 * Interactive Convex project (re)configuration: runs `convex dev --configure`
 * with cwd = this package so `.convex/` and `convex.json` resolve correctly.
 *
 * Run: `bun run setup` from `apps/backend`, or `bun apps/backend/scripts/setup.ts` from repo root.
 */

export async function setupConvexProject({
  packageRoot,
}: {
  packageRoot: string;
}): Promise<Bun.Subprocess> {
  const proc = Bun.spawn({
    cmd: ["bunx", "convex", "dev", "--configure"],
    cwd: packageRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Failed to setup convex project (exit ${code}).`);
  }

  return proc;
}
