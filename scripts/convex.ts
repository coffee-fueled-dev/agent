#!/usr/bin/env bun

import { exit } from "node:process";
import { runConvexExit } from "./_lib/convexCli";
import { withConvexNodeEnv } from "./_lib/convexNode";
import { readRootEnv } from "./_lib/rootEnv";

const { vars } = await readRootEnv();
const env = withConvexNodeEnv({
  ...process.env,
  ...vars,
});
const cwd = new URL("../", import.meta.url).pathname;
const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(
    "Expected convex CLI arguments, e.g. `bun run scripts/convex.ts dev`",
  );
}

exit(await runConvexExit(args, cwd, env));
