#!/usr/bin/env bun

import { execPath, exit } from "node:process";
import { forward } from "@ngrok/ngrok";
import { forwardSignalsToChild, spawnConvex } from "./_lib/convexCli";
import { withConvexNodeEnv } from "./_lib/convexNode";
import { readRootEnv } from "./_lib/rootEnv";
import { syncShellEnvFromLocal } from "./_lib/syncConvexShellEnv";

const { vars } = await readRootEnv();
const varsRecord = vars as Record<string, string>;

if (process.env.NGROK_AUTHTOKEN?.trim() || varsRecord.NGROK_AUTHTOKEN?.trim()) {
  const site =
    vars.CONVEX_SITE_URL ?? vars.CONVEX_URL ?? "http://127.0.0.1:3211";
  const u = new URL(site);
  const port = u.port
    ? Number.parseInt(u.port, 10)
    : u.protocol === "https:"
      ? 443
      : 80;
  const listener = await forward({
    addr: port,
    authtoken_from_env: true,
  });
  const url = listener.url();
  if (url) {
    varsRecord.NGROK_URL = url;
    console.log(`[dev:convex] ngrok tunnel: ${url}`);
  }
}

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
