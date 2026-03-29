#!/usr/bin/env bun
/**
 * Runs `bun --env-file=.env.local` from repo root, and when
 * `apps/<app>/.env.local` exists, appends it so later file wins.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const appDir = process.argv[2];
const filter = process.argv[3];
const npmScript = process.argv[4];

if (!appDir || !filter || !npmScript) {
  console.error(
    "Usage: dev-app.ts <appDir> <workspaceFilter> <script>\nExample: dev-app.ts filesystem @agent/filesystem dev",
  );
  exit(1);
}

const args = ["bun", "--env-file", join(repoRoot, ".env.local")];
const overlay = join(repoRoot, "apps", appDir, ".env.local");
if (existsSync(overlay)) {
  args.push("--env-file", overlay);
}
args.push("--filter", filter, npmScript);

const proc = Bun.spawn(args, {
  cwd: repoRoot,
  stdio: ["inherit", "inherit", "inherit"],
});
exit(await proc.exited);
