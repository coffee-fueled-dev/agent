import { existsSync } from "node:fs";
import { join } from "node:path";

export const CONVEX_NODE_VERSION = "v24.14.0";

export function withConvexNodeEnv(
  env: Record<string, string | undefined> = process.env,
) {
  const home = env.HOME;
  if (!home) {
    throw new Error("HOME is required to locate the pinned Convex Node runtime");
  }
  const nodeBin = join(
    home,
    ".nvm",
    "versions",
    "node",
    CONVEX_NODE_VERSION,
    "bin",
  );
  if (!existsSync(join(nodeBin, "node"))) {
    throw new Error(
      `Pinned Convex Node runtime ${CONVEX_NODE_VERSION} is not installed at ${nodeBin}`,
    );
  }
  return {
    ...env,
    PATH: env.PATH ? `${nodeBin}:${env.PATH}` : nodeBin,
  };
}
