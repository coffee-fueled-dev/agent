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

/** Convex dev prints this when the backend is accepting work (local or cloud). */
const CONVEX_DEV_READY_RE = /Convex functions ready!/;

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

function quoteEnvValue(v: string): string {
  if (/^[\w@%+/=:.-]+$/.test(v)) return v;
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Ensures BUN_PUBLIC_CONVEX_URL and BUN_PUBLIC_ACCOUNT_TOKEN exist in `.env.local` and `process.env`.
 * Reads source values from `process.env` (already populated by Bun's `--env-file` at startup).
 */
export async function ensurePublicEnvInDotenvLocal(cwd: string): Promise<void> {
  const envPath = path.join(cwd, ".env.local");
  let raw = "";
  if (await Bun.file(envPath).exists()) {
    raw = await Bun.file(envPath).text();
  }

  const convexUrl = process.env.CONVEX_URL || "";
  let token = process.env.BUN_PUBLIC_ACCOUNT_TOKEN;
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
    // bunfig.toml uses `env = "BUN_PUBLIC_*"` so the browser bundle only inlines
    // BUN_PUBLIC_ keys from `.env.local`. Without this line the frontend has no Convex URL.
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
 * Interactive Convex project linking (`convex dev --configure`). Used by `bun configure` only.
 *
 * Stops the subprocess once "Convex functions ready!" appears so you can run `bun dev` separately.
 * Does NOT re-parse `.env.local` — `bun dev` will load the updated file at startup.
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
          'Timed out waiting for Convex functions ready during configure.',
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

export type ConvexDevRun = {
  subprocess: Bun.Subprocess;
  ready: Promise<void>;
};

/** Set a single Convex dashboard env var. Inherits process.env (Bun already loaded .env.local). */
export async function convexEnvSetInDeployment(opts: {
  cwd: string;
  key: string;
  value: string;
}): Promise<void> {
  const { cwd, key, value } = opts;
  const proc = Bun.spawn({
    cmd: ["bunx", "convex", "env", "set", key, value],
    cwd,
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
  const dashboardEnv = convexDashboardEnvSchema.parse(appEnv);

  for (const [key, value] of Object.entries(dashboardEnv)) {
    if (value === undefined || value === "") continue;
    const proc = Bun.spawn({
      cmd: ["bunx", "convex", "env", "set", key, value],
      cwd,
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
    stdout: "pipe",
    stderr: "pipe",
  });

  let combined = "";
  let sawReadyBanner = false;

  type ReadyOutcome = "pending" | "resolved" | "rejected";
  let readyOutcome: ReadyOutcome = "pending";

  let resolveReady!: () => void;
  let rejectReady!: (e: unknown) => void;
  const ready = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  function finalizeFailure(reason: Error) {
    if (readyOutcome !== "pending") return;
    readyOutcome = "rejected";
    clearTimeout(timeoutId);
    void (async () => {
      try {
        subprocess.kill("SIGTERM");
      } catch {
        // ignore
      }
      await awaitProcessExitWithSigkillFallback(subprocess);
      rejectReady(reason);
    })();
  }

  timeoutId = setTimeout(() => {
    finalizeFailure(
      new Error(
        'Timed out waiting for Convex dev (expected "Convex functions ready!" in output).',
      ),
    );
  }, 180_000);

  function tryReady(chunk: string) {
    combined += chunk;
    if (sawReadyBanner) return;
    if (!CONVEX_DEV_READY_RE.test(combined)) return;
    sawReadyBanner = true;
    clearTimeout(timeoutId);
    void (async () => {
      try {
        if (!process.env.CONVEX_URL) {
          throw new Error(
            "Missing CONVEX_URL in process.env after Convex dev ready. Ensure .env.local has CONVEX_URL.",
          );
        }
        if (!process.env.BUN_PUBLIC_CONVEX_URL) {
          process.env.BUN_PUBLIC_CONVEX_URL = process.env.CONVEX_URL;
        }
        await ensurePublicEnvInDotenvLocal(cwd);
        console.log(
          "Convex dev ready: ensured BUN_PUBLIC env vars in .env.local.",
        );
        if (readyOutcome !== "pending") return;
        readyOutcome = "resolved";
        resolveReady();
      } catch (e) {
        finalizeFailure(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  }

  const pump = Promise.all([
    forwardStream(subprocess.stdout, process.stdout, tryReady),
    forwardStream(subprocess.stderr, process.stderr, tryReady),
  ]);

  void pump.then(() => {
    if (readyOutcome !== "pending" || sawReadyBanner) return;
    finalizeFailure(
      new Error(
        'convex dev exited before reporting ready (no "Convex functions ready!" in output).',
      ),
    );
  });

  void subprocess.exited.then((code) => {
    if (readyOutcome !== "pending") return;
    finalizeFailure(
      new Error(
        sawReadyBanner
          ? `convex dev exited with code ${code} while setting up env after ready.`
          : `convex dev exited with code ${code} before reporting ready.`,
      ),
    );
  });

  return { subprocess, ready };
}
