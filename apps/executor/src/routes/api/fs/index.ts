import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Bash, ReadWriteFs } from "just-bash";
import { getLocalShellSecret, isLocalAgentEnabled } from "./env.js";
import { getSandboxRoot, resolveSafePath } from "./sandbox.js";

const secret = getLocalShellSecret();

const bashBySandboxRoot = new Map<string, Bash>();

function getBashForSandbox(hostRoot: string): Bash {
  let bash = bashBySandboxRoot.get(hostRoot);
  if (!bash) {
    const rwfs = new ReadWriteFs({ root: hostRoot, allowSymlinks: false });
    bash = new Bash({
      fs: rwfs,
      cwd: "/",
      network: undefined,
      javascript: false,
      python: false,
      executionLimits: {
        maxCallDepth: 100,
        maxCommandCount: 10_000,
        maxLoopIterations: 10_000,
        maxAwkIterations: 10_000,
        maxSedIterations: 10_000,
        maxOutputSize: 10 * 1024 * 1024,
      },
    });
    bashBySandboxRoot.set(hostRoot, bash);
  }
  return bash;
}

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function checkAuth(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function readSandboxId(body: Record<string, unknown>): string {
  const raw =
    (typeof body.sandboxId === "string" ? body.sandboxId.trim() : "") ||
    (typeof body.agentId === "string" ? body.agentId.trim() : "");
  return raw;
}

export const fsExecuteRoute = {
  POST: async (req: Request) => {
    if (!isLocalAgentEnabled()) return notFound();
    if (!checkAuth(req)) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const command = typeof body.command === "string" ? body.command.trim() : "";
    const sandboxId = readSandboxId(body);
    if (!command || !sandboxId) {
      return Response.json(
        { error: "command and sandboxId (or agentId) are required" },
        { status: 400 },
      );
    }

    const hostRoot = getSandboxRoot(sandboxId);
    const bash = getBashForSandbox(hostRoot);
    const result = await bash.exec(command);

    return Response.json({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      sandboxRoot: hostRoot,
      cwd: bash.getCwd(),
    });
  },
};

export const fsReadRoute = {
  POST: async (req: Request) => {
    if (!isLocalAgentEnabled()) return notFound();
    if (!checkAuth(req)) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sandboxId = readSandboxId(body);
    const rel = typeof body.path === "string" ? body.path.trim() : "";
    if (!sandboxId || !rel) {
      return Response.json(
        { error: "sandboxId (or agentId) and path are required" },
        { status: 400 },
      );
    }

    const root = getSandboxRoot(sandboxId);
    let full: string;
    try {
      full = resolveSafePath(root, rel);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Invalid path" },
        { status: 400 },
      );
    }

    try {
      const content = await readFile(full, "utf8");
      return Response.json({ ok: true, content });
    } catch {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
  },
};

export const fsWriteRoute = {
  POST: async (req: Request) => {
    if (!isLocalAgentEnabled()) return notFound();
    if (!checkAuth(req)) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sandboxId = readSandboxId(body);
    const rel = typeof body.path === "string" ? body.path.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    if (!sandboxId || !rel) {
      return Response.json(
        { error: "sandboxId (or agentId) and path are required" },
        { status: 400 },
      );
    }

    const root = getSandboxRoot(sandboxId);
    let full: string;
    try {
      full = resolveSafePath(root, rel);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Invalid path" },
        { status: 400 },
      );
    }

    try {
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, "utf8");
      return Response.json({ ok: true, success: true });
    } catch (e) {
      return Response.json(
        {
          error: e instanceof Error ? e.message : "Write failed",
        },
        { status: 500 },
      );
    }
  },
};
