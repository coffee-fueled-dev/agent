import { randomBytes } from "node:crypto";
import path from "node:path";
import {
  type ConvexDashboardEnv,
  convexDashboardEnvSchema,
} from "@agent/config";
import { forwardStream } from "./_lib.ts";

/** Same as `convexDashboardEnvSchema` from `@agent/config` (Convex `convex env set` keys). */
export const convexEnvSchema = convexDashboardEnvSchema;
export type { ConvexDashboardEnv };

const CONVEX_DEV_READY_RE =
  /Provisioned a dev deployment|Convex functions ready!/;

async function awaitProcessExitWithSigkillFallback(p: Bun.Subprocess) {
  const t = setTimeout(() => {
    try {
      p.kill("SIGKILL");
    } catch {
      // ignore
    }
  }, 8000);
  try {
    await p.exited;
  } finally {
    clearTimeout(t);
  }
}

function parseDotenvLines(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function applyParsedEnvToProcess(parsed: Record<string, string>) {
  for (const [k, v] of Object.entries(parsed)) {
    process.env[k] = v;
  }
  const convexUrl = process.env.CONVEX_URL?.trim();
  if (convexUrl && !process.env.BUN_PUBLIC_CONVEX_URL?.trim()) {
    process.env.BUN_PUBLIC_CONVEX_URL = convexUrl;
  }
}

function quoteEnvValue(v: string): string {
  if (/^[\w@%+/=:.-]+$/.test(v)) return v;
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Ensures BUN_PUBLIC_CONVEX_URL and BUN_PUBLIC_ACCOUNT_TOKEN exist in `.env.local` and `process.env`. */
export async function ensurePublicEnvInDotenvLocal(cwd: string): Promise<void> {
  const envPath = path.join(cwd, ".env.local");
  let raw = "";
  if (await Bun.file(envPath).exists()) {
    raw = await Bun.file(envPath).text();
  }
  const parsed = parseDotenvLines(raw);
  const convexUrl =
    process.env.CONVEX_URL?.trim() ||
    parsed.CONVEX_URL?.trim() ||
    parsed.BUN_PUBLIC_CONVEX_URL?.trim() ||
    "";
  let token =
    process.env.BUN_PUBLIC_ACCOUNT_TOKEN?.trim() ||
    parsed.BUN_PUBLIC_ACCOUNT_TOKEN?.trim();
  if (!token) token = randomBytes(32).toString("hex");

  const lines = raw.split("\n").filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return true;
    const eq = t.indexOf("=");
    if (eq === -1) return true;
    const k = t.slice(0, eq).trim();
    return k !== "BUN_PUBLIC_CONVEX_URL" && k !== "BUN_PUBLIC_ACCOUNT_TOKEN";
  });
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  const out: string[] = [...lines];
  if (convexUrl) {
    process.env.BUN_PUBLIC_CONVEX_URL = convexUrl;
    // Always emit `BUN_PUBLIC_CONVEX_URL` for the agent app: `bunfig.toml` uses `env = "BUN_PUBLIC_*"` so the
    // browser bundle only inlines those keys from `.env.local` / `--env-file`. Skipping this line when it
    // matched `CONVEX_URL` left the bundler with no `BUN_PUBLIC_CONVEX_URL` (Convex WebSocket failed with 1006).
    // Duplicate URL values may trigger “Can't safely modify .env.local for CONVEX_URL” from the Convex CLI; harmless for dev.
    out.push(`BUN_PUBLIC_CONVEX_URL=${quoteEnvValue(convexUrl)}`);
  }
  out.push(`BUN_PUBLIC_ACCOUNT_TOKEN=${quoteEnvValue(token)}`);
  process.env.BUN_PUBLIC_ACCOUNT_TOKEN = token;
  await Bun.write(envPath, `${out.join("\n")}\n`);
}

export async function isConvexProjectConfigured(cwd: string): Promise<boolean> {
  const p = path.join(cwd, ".convex", "local", "default", "config.json");
  return Bun.file(p).exists();
}

/**
 * Interactive Convex project linking with a **local** dev deployment (`--dev-deployment local`).
 *
 * `convex dev --configure` keeps running as a dev server after setup; we stop it once we see
 * the same “ready” line as normal `convex dev` so this function can return (and `bun run dev`
 * can start a fresh orchestrated dev).
 */
export async function setupConvexProject(opts: { cwd: string }): Promise<void> {
  const { cwd } = opts;

  const subprocess = Bun.spawn({
    cmd: ["bunx", "convex", "dev", "--configure", "--dev-deployment", "local"],
    cwd,
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });

  let combined = "";
  /** Set synchronously when `CONVEX_DEV_READY_RE` matches so `exited` cannot reject in a race. */
  let finished = false;

  let resolveSetup!: () => void;
  let rejectSetup!: (e: unknown) => void;
  const setupDone = new Promise<void>((res, rej) => {
    resolveSetup = res;
    rejectSetup = rej;
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  const cleanupListeners = () => {
    clearTimeout(timeoutId);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };

  function onSigint() {
    try {
      subprocess.kill("SIGINT");
    } catch {
      // ignore
    }
  }

  function onSigterm() {
    try {
      subprocess.kill("SIGTERM");
    } catch {
      // ignore
    }
  }

  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  async function afterFunctionsReady() {
    cleanupListeners();
    try {
      subprocess.kill("SIGTERM");
    } catch {
      // ignore
    }
    try {
      await awaitProcessExitWithSigkillFallback(subprocess);
      await Bun.sleep(100);
      const envPath = path.join(cwd, ".env.local");
      if (await Bun.file(envPath).exists()) {
        applyParsedEnvToProcess(
          parseDotenvLines(await Bun.file(envPath).text()),
        );
      }
      await ensurePublicEnvInDotenvLocal(cwd);
      resolveSetup();
    } catch (e) {
      rejectSetup(e);
    }
  }

  function onOutputChunk(chunk: string) {
    combined += chunk;
    if (finished) return;
    if (!CONVEX_DEV_READY_RE.test(combined)) return;
    finished = true;
    void afterFunctionsReady();
  }

  timeoutId = setTimeout(() => {
    void (async () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      try {
        subprocess.kill("SIGTERM");
      } catch {
        // ignore
      }
      await awaitProcessExitWithSigkillFallback(subprocess);
      rejectSetup(
        new Error(
          "Timed out waiting for Convex functions ready during setup (expected “Provisioned…” or “Convex functions ready!” in output).",
        ),
      );
    })();
  }, 180_000);

  void subprocess.exited.then((code) => {
    if (finished) return;
    finished = true;
    cleanupListeners();
    rejectSetup(
      new Error(
        code
          ? `convex dev --configure exited with code ${code} before functions were ready.`
          : "convex dev --configure exited before functions were ready.",
      ),
    );
  });

  void Promise.all([
    forwardStream(subprocess.stdout, process.stdout, onOutputChunk),
    forwardStream(subprocess.stderr, process.stderr, onOutputChunk),
  ]).then(() => {
    if (finished) return;
    finished = true;
    cleanupListeners();
    rejectSetup(
      new Error(
        "convex dev output ended before Convex reported functions ready.",
      ),
    );
  });

  await setupDone;
}

async function mergeEnvFromRootDotenvLocal(cwd: string) {
  const envPath = path.join(cwd, ".env.local");
  await Bun.sleep(50);
  const f = Bun.file(envPath);
  if (!(await f.exists())) {
    throw new Error(
      `Expected ${envPath} after Convex dev reported ready (check convex dev output).`,
    );
  }
  const parsed = parseDotenvLines(await f.text());
  const url = parsed.CONVEX_URL?.trim() ?? parsed.BUN_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    throw new Error(
      `Expected CONVEX_URL or BUN_PUBLIC_CONVEX_URL in ${envPath} after Convex dev ready.`,
    );
  }
  applyParsedEnvToProcess(parsed);
  await ensurePublicEnvInDotenvLocal(cwd);
  console.log(
    "Convex dev: merged repo .env.local into this process (agent / executor env).",
  );
}

export type ConvexDevRun = {
  subprocess: Bun.Subprocess;
  ready: Promise<void>;
};

/** Set a single Convex dashboard env var (same spawn env as `runConvexDev`). */
export async function convexEnvSetInDeployment(opts: {
  cwd: string;
  key: string;
  value: string;
}): Promise<void> {
  const { cwd, key, value } = opts;
  let env: Record<string, string | undefined> = { ...process.env };

  const localConfigPath = path.join(cwd, ".convex/local/default/config.json");
  const localConfigFile = Bun.file(localConfigPath);
  if (await localConfigFile.exists()) {
    try {
      const local = (await localConfigFile.json()) as {
        deploymentName?: string;
      };
      if (typeof local.deploymentName === "string" && local.deploymentName) {
        env = { ...env, CONVEX_DEPLOYMENT: local.deploymentName };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const proc = Bun.spawn({
    cmd: ["bunx", "convex", "env", "set", key, value],
    cwd,
    env: env as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Failed to set convex env: ${key}`);
  }
}

export async function runConvexDev(opts: {
  appEnv: ConvexDashboardEnv;
  cwd: string;
}): Promise<ConvexDevRun> {
  const { appEnv, cwd } = opts;
  const parsed = convexDashboardEnvSchema.parse(appEnv);

  let env: Record<string, string | undefined> = { ...process.env, ...parsed };

  const localConfigPath = path.join(cwd, ".convex/local/default/config.json");
  const localConfigFile = Bun.file(localConfigPath);
  if (await localConfigFile.exists()) {
    try {
      const local = (await localConfigFile.json()) as {
        deploymentName?: string;
      };
      if (typeof local.deploymentName === "string" && local.deploymentName) {
        env = { ...env, CONVEX_DEPLOYMENT: local.deploymentName };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined || value === "") continue;
    const proc = Bun.spawn({
      cmd: ["bunx", "convex", "env", "set", key, value],
      cwd,
      env: env as Record<string, string>,
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`Failed to set convex env: ${key}`);
    }
  }

  const subprocess = Bun.spawn({
    cmd: ["bunx", "convex", "dev", "--typecheck-components"],
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  let combined = "";
  let readySettled = false;

  let resolveReady!: () => void;
  let rejectReady!: (e: unknown) => void;
  const ready = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });

  const timeout = setTimeout(() => {
    if (!readySettled) {
      rejectReady(
        new Error(
          "Timed out waiting for Convex dev (expected “Provisioned…” or “Convex functions ready!” in output).",
        ),
      );
    }
  }, 180_000);

  function tryMergeFromStreamChunk(chunk: string) {
    combined += chunk;
    if (readySettled) return;
    if (!CONVEX_DEV_READY_RE.test(combined)) return;
    readySettled = true;
    clearTimeout(timeout);
    void mergeEnvFromRootDotenvLocal(cwd).then(resolveReady, (e) => {
      rejectReady(e);
    });
  }

  const pump = Promise.all([
    forwardStream(subprocess.stdout, process.stdout, tryMergeFromStreamChunk),
    forwardStream(subprocess.stderr, process.stderr, tryMergeFromStreamChunk),
  ]);

  void pump.then(() => {
    if (!readySettled) {
      clearTimeout(timeout);
      rejectReady(
        new Error(
          "convex dev exited before reporting ready (no provision / functions ready in output).",
        ),
      );
    }
  });

  void subprocess.exited.then((code) => {
    if (readySettled) return;
    clearTimeout(timeout);
    rejectReady(
      new Error(`convex dev exited with code ${code} before reporting ready.`),
    );
  });

  return { subprocess, ready };
}
