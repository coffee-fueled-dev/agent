import path from "node:path";
import { $ } from "bun";
import { z } from "zod";
import { forwardStream } from "../../../scripts/_lib.ts";

export const backendDevAppEnvSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  EMBEDDING_SERVER_URL: z.string().min(1),
  BINARY_EMBEDDING_SECRET: z.string().min(1),
  EXECUTOR_URL: z.string().min(1),
  LOCAL_SHELL_SECRET: z.string().min(1),
  SHELL_EXECUTOR_ENABLED: z.string().min(1),
  BROWSER_EXECUTOR_ENABLED: z.string().min(1),
  BROWSERBASE_API_KEY: z.string().min(1),
  BROWSERBASE_PROJECT_ID: z.string().min(1),
  QUERY_URL_GEMINI_MODEL: z.string().optional(),
  STORAGE_PUBLIC_TUNNEL_ORIGIN: z.string().optional(),
  BROWSERBASE_STAGEHAND_CUA_MODEL: z.string().optional(),
});

type AppEnv = z.infer<typeof backendDevAppEnvSchema>;

export type BackendDevOptions = {
  appEnv: AppEnv;
  /** Convex app directory (`apps/backend`). Resolved by the runner; not `process.cwd()`. */
  packageRoot: string;
};

/** Fired when `convex dev` logs provision or “functions ready”; then we read `.env.local` here (same cwd). */
const CONVEX_DEV_READY_RE =
  /Provisioned a dev deployment|Convex functions ready!/;

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

function applyBackendDotenvToProcess(parsed: Record<string, string>) {
  for (const [k, v] of Object.entries(parsed)) {
    process.env[k] = v;
  }
  const convexUrl = process.env.CONVEX_URL?.trim();
  if (convexUrl && !process.env.BUN_PUBLIC_CONVEX_URL?.trim()) {
    process.env.BUN_PUBLIC_CONVEX_URL = convexUrl;
  }
}

async function mergeEnvFromBackendDotenvLocal(cwd: string) {
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
  applyBackendDotenvToProcess(parsed);
  console.log(
    "Convex dev: merged apps/backend/.env.local into this process (for agent / executor).",
  );
}

export type BackendDevRun = {
  subprocess: Bun.Subprocess;
  /** Resolves after `convex dev` prints provision or “functions ready” and this dir’s `.env.local` has been merged into `process.env`. */
  ready: Promise<void>;
};

export async function runDev(opts: BackendDevOptions): Promise<BackendDevRun> {
  const { appEnv, packageRoot } = opts;
  const parsed = backendDevAppEnvSchema.parse(appEnv);

  const cwd = path.resolve(packageRoot);
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
    const r = await $`bunx convex env set ${key} ${value}`;
    if (r.exitCode !== 0) {
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
    void mergeEnvFromBackendDotenvLocal(cwd).then(resolveReady, (e) => {
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
