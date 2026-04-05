import path from "node:path";
import { setupConvexProject } from "../apps/backend/scripts/setup.ts";

const backendRoot = path.join(import.meta.dir, "..", "apps", "backend");

export async function setup() {
  await setupConvexProject({
    packageRoot: backendRoot,
  });
}

setup().catch((err) => {
  console.error(err);
  process.exit(1);
});
