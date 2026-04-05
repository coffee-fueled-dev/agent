import path from "node:path";
import { setupConvexProject } from "./convex.ts";

const monorepoRoot = path.join(import.meta.dir, "..");

export async function setup() {
  await setupConvexProject({ cwd: monorepoRoot });
}

setup().catch((err) => {
  console.error(err);
  process.exit(1);
});
