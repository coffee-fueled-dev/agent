/// <reference path="./repo-env.d.ts" />
import path from "node:path";
import { setupConvexProject } from "./convex.ts";

const monorepoRoot = path.join(import.meta.dir, "..");

async function main() {
  console.log(
    "Convex configure — follow the prompts (project link, local vs cloud deployment, etc.).\n",
  );
  await setupConvexProject({ cwd: monorepoRoot });
  console.log("\nConfigure finished. Run `bun dev` to start Convex, ngrok (if enabled), agent, and executor.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
