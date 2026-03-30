#!/usr/bin/env bun

import { execPath, exit } from "node:process";
import { forward } from "@ngrok/ngrok";
import { forwardSignalsToChild, spawnConvex } from "./_lib/convexCli";
import { withConvexNodeEnv } from "./_lib/convexNode";
import { readRootEnv } from "./_lib/rootEnv";
import { syncShellEnvFromLocal } from "./_lib/syncConvexShellEnv";

const { vars } = await readRootEnv();

/** `.env.local` is parsed into `vars` only — not `process.env`. `authtoken_from_env` reads the latter, so pass the token explicitly. */
const ngrokAuthtoken =
  process.env.NGROK_AUTHTOKEN?.trim() || vars.NGROK_AUTHTOKEN?.trim();

/** Reserved domain hostname (e.g. `myapp.ngrok-free.app`), not the dashboard `rd_...` id. */
const ngrokDomain =
  process.env.NGROK_DOMAIN?.trim() ||
  process.env.NGROK_HOSTNAME?.trim() ||
  vars.NGROK_DOMAIN?.trim() ||
  vars.NGROK_HOSTNAME?.trim();

if (ngrokAuthtoken) {
  const convexAPI = vars.CONVEX_URL ?? "http://127.0.0.1:3210";
  const u = new URL(convexAPI);
  const port = u.port
    ? Number.parseInt(u.port, 10)
    : u.protocol === "https:"
      ? 443
      : 80;
  const listener = await forward({
    addr: port,
    authtoken: ngrokAuthtoken,
    ...(ngrokDomain ? { domain: ngrokDomain } : {}),
  });
  const url = listener.url();
  if (url) {
    vars.NGROK_URL = url;
    console.log(
      `[dev:convex] ngrok tunnel: ${url}${ngrokDomain ? ` (domain: ${ngrokDomain})` : ""}`,
    );
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
