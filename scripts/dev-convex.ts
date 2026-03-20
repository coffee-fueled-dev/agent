#!/usr/bin/env bun

import { execPath, exit } from "node:process";
import { readRootEnv } from "./_lib/chatEnv";

const { vars } = await readRootEnv();
const env = {
  ...process.env,
  ...vars,
};
const cwd = new URL("../", import.meta.url).pathname;

const convexDev = Bun.spawn(["bunx", "convex", "dev"], {
  cwd,
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    convexDev.kill(signal);
  });
}

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
