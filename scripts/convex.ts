#!/usr/bin/env bun

import { exit } from "node:process";
import { readRootEnv } from "./_lib/chatEnv";
import { withConvexNodeEnv } from "./_lib/convexNode";

const { vars } = await readRootEnv();
const env = withConvexNodeEnv({
  ...process.env,
  ...vars,
});
const cwd = new URL("../", import.meta.url).pathname;
const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error("Expected convex CLI arguments, e.g. `bun run scripts/convex.ts dev`");
}

const convex = Bun.spawn(["bunx", "convex", ...args], {
  cwd,
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    convex.kill(signal);
  });
}

exit(await convex.exited);
