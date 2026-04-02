#!/usr/bin/env bun

import { execPath, exit } from "node:process";
import { forwardSignalsToChild, spawnConvex } from "./_lib/convexCli";
import { withConvexNodeEnv } from "./_lib/convexNode";
import { readRootEnv } from "./_lib/rootEnv";
import { syncShellEnvFromLocal } from "./_lib/syncConvexShellEnv";

const { vars } = await readRootEnv();
Object.assign(process.env, vars);

const env = withConvexNodeEnv({
  ...process.env,
  ...vars,
});
const cwd = new URL("../", import.meta.url).pathname;

await syncShellEnvFromLocal(cwd, env, vars);

const convexDev = spawnConvex(["dev"], cwd, env);
forwardSignalsToChild(convexDev);

const seedProcess = Bun.spawn([execPath, "run", "scripts/seed-chat-token.ts"], {
  cwd,
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const seedExitCode = await seedProcess.exited;
if (seedExitCode !== 0) {
  convexDev.kill();
  exit(seedExitCode);
}

exit(await convexDev.exited);
