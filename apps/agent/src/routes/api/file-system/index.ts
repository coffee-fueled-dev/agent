import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { $ } from "bun";
import {
  getAgentHomeRoot,
  getFilesystemDbPath,
  getLocalShellSecret,
  isLocalAgentEnabled,
} from "./env.js";

const dbPath = getFilesystemDbPath();
const homeRoot = getAgentHomeRoot();
const secret = getLocalShellSecret();

mkdirSync(dirname(dbPath), { recursive: true });
mkdirSync(homeRoot, { recursive: true });

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

export const fileSystemRoute = {
  POST: async (req: Request) => {
    if (!isLocalAgentEnabled()) {
      return new Response("Not found", { status: 404 });
    }

    const url = new URL(req.url);
    if (url.pathname !== "/api/file-system/execute") {
      return new Response("Not found", { status: 404 });
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
};
