import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Major line from `.nvmrc` (e.g. `22` → `"22"`). Must match Convex
 * [`node.nodeVersion`](https://docs.convex.dev/production/project-configuration#configuring-the-nodejs-version)
 * (supported: 18, 20, 22).
 */
export function readNvmrcMajor(): string {
  const nvmrcPath = join(repoRoot, ".nvmrc");
  if (!existsSync(nvmrcPath)) {
    throw new Error(
      `Missing ${nvmrcPath}. Add a major version line (e.g. 22) for nvm.`,
    );
  }
  const raw = readFileSync(nvmrcPath, "utf8").trim();
  const first = raw.split(/\s+/)[0] ?? "";
  const withoutV = first.replace(/^v/i, "");
  const major = withoutV.split(".")[0] ?? withoutV;
  if (!/^\d+$/.test(major)) {
    throw new Error(
      `.nvmrc must start with a numeric major (e.g. 22), got: ${raw}`,
    );
  }
  return major;
}

/**
 * Latest `~/.nvm/versions/node/v{major}.*` install matching the repo `.nvmrc`.
 */
export function findNvmNodeBin(home: string, major: string): string | null {
  const base = join(home, ".nvm", "versions", "node");
  if (!existsSync(base)) return null;

  const dirs = readdirSync(base).filter(
    (d) => d.startsWith(`v${major}.`) || d === `v${major}`,
  );
  if (dirs.length === 0) return null;

  dirs.sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
  );
  if (!dirs[0]) return null;

  const bin = join(base, dirs[0], "bin");
  if (!existsSync(join(bin, "node"))) {
    return null;
  }
  return bin;
}

/**
 * Prepends the nvm-managed `node` from `.nvmrc` so the Convex CLI can bundle
 * [`"use node"`](https://docs.convex.dev/functions/runtimes#nodejs-runtime) actions locally.
 */
export function withConvexNodeEnv(
  env: Record<string, string | undefined> = process.env,
) {
  const home = env.HOME;
  if (!home) {
    throw new Error("HOME is required to locate the nvm Node runtime");
  }

  const major = readNvmrcMajor();
  const nodeBin = findNvmNodeBin(home, major);
  if (!nodeBin) {
    throw new Error(
      [
        `No Node v${major}.x install found under ${join(home, ".nvm/versions/node")}.`,
        'Convex local backend needs Node 18, 20, 22, or 24 for "use node" actions.',
        "From the repo root:",
        "  nvm install   # reads .nvmrc",
        "  nvm use",
      ].join("\n"),
    );
  }

  return {
    ...env,
    PATH: env.PATH ? `${nodeBin}:${env.PATH}` : nodeBin,
  };
}
