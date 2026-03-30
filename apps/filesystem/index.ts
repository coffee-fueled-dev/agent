import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { $ } from "bun";
import { dbPath, homeRoot, hostname, port, secret } from "./env";

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath, { create: true });
db.run("PRAGMA journal_mode = WAL;");
db.run(
  "CREATE TABLE IF NOT EXISTS agent_cwd (agent_id TEXT PRIMARY KEY NOT NULL, cwd TEXT NOT NULL)",
);

const cwdGet = db.query<{ cwd: string }, { $agentId: string }>(
  "SELECT cwd FROM agent_cwd WHERE agent_id = $agentId",
);
const cwdUpsert = db.query(
  "INSERT OR REPLACE INTO agent_cwd (agent_id, cwd) VALUES ($agentId, $cwd)",
);

function resolveCwd(agentId: string): string {
  const safeId = agentId.replace(/[/\\]/g, "_");
  const row = cwdGet.get({ $agentId: safeId });
  if (row?.cwd) return row.cwd;
  const cwd = join(homeRoot, safeId);
  mkdirSync(cwd, { recursive: true });
  cwdUpsert.run({ $agentId: safeId, $cwd: cwd });
  return cwd;
}

const server = Bun.serve({
  hostname,
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/execute") {
      return new Response("Not found", { status: 404 });
    }

    if (!secret) {
      return Response.json(
        { error: "LOCAL_SHELL_SECRET must be set in production" },
        { status: 500 },
      );
    }

    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { command?: string; agentId?: string };
    try {
      body = (await req.json()) as { command?: string; agentId?: string };
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const command = typeof body.command === "string" ? body.command.trim() : "";
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    if (!command || !agentId) {
      return Response.json(
        { error: "command and agentId are required" },
        { status: 400 },
      );
    }

    const cwd = resolveCwd(agentId);

    // Parsing / whitelist: Convex Node action (`runShell` → executeLocalShell) before calling here.

    // Bun Shell: run the full line as a script in the agent cwd (see https://bun.com/docs/runtime/shell )
    const { stdout, stderr, exitCode } = await $`${{ raw: command }}`
      .cwd(cwd)
      .nothrow()
      .quiet();

    return Response.json({
      ok: true,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode,
      cwd,
    });
  },
});

console.log(`@agent/filesystem listening at ${server.url}`);
