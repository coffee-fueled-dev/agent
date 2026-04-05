import path from "node:path";
import { runDev as runAgentDev } from "../apps/agent/scripts/dev.ts";
import { runDev as runBackendDev } from "../apps/backend/scripts/dev.ts";
import { runDev as runExecutorDev } from "../apps/executor/scripts/dev.ts";

/** Set on the orchestrator process after the nested check so all dev children inherit it. */
const ORCHESTRATOR_CHILD_ENV = "MONOREPO_DEV_ORCHESTRATOR_CHILD";

if (process.env[ORCHESTRATOR_CHILD_ENV] === "1") {
  console.error(
    `${ORCHESTRATOR_CHILD_ENV}=1: refusing to run the monorepo dev orchestrator (would recurse or nest).`,
  );
  process.exit(1);
}

/** Populated during `main()` so `main().catch` can always tear down. */
const devChildren: Bun.Subprocess[] = [];

function killAll(children: readonly Bun.Subprocess[]) {
  for (const c of children) {
    try {
      c.kill();
    } catch {
      // ignore
    }
  }
}

async function main() {
  process.env[ORCHESTRATOR_CHILD_ENV] = "1";

  devChildren.length = 0;

  const monorepoRoot = path.join(import.meta.dir, "..");

  const shutdownAll = () => killAll(devChildren);

  const fatal = (err: unknown) => {
    console.error(err);
    shutdownAll();
    process.exit(1);
  };
  process.once("uncaughtException", fatal);
  process.once("unhandledRejection", fatal);

  try {
    const { subprocess: backendProc, ready: backendReady } = await runBackendDev({
      appEnv: {
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        EMBEDDING_SERVER_URL: process.env.EMBEDDING_SERVER_URL,
        BINARY_EMBEDDING_SECRET: process.env.BINARY_EMBEDDING_SECRET,
        EXECUTOR_URL: process.env.EXECUTOR_URL,
        LOCAL_SHELL_SECRET: process.env.LOCAL_SHELL_SECRET,
        SHELL_EXECUTOR_ENABLED: process.env.SHELL_EXECUTOR_ENABLED,
        BROWSER_EXECUTOR_ENABLED: process.env.BROWSER_EXECUTOR_ENABLED,
        BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID,
        QUERY_URL_GEMINI_MODEL: process.env.QUERY_URL_GEMINI_MODEL,
        STORAGE_PUBLIC_TUNNEL_ORIGIN: process.env.STORAGE_PUBLIC_TUNNEL_ORIGIN,
        BROWSERBASE_STAGEHAND_CUA_MODEL:
          process.env.BROWSERBASE_STAGEHAND_CUA_MODEL,
      },
      packageRoot: path.join(monorepoRoot, "apps/backend"),
    });
    devChildren.push(backendProc);
    await backendReady;

    const publicConvexUrl =
      process.env.BUN_PUBLIC_CONVEX_URL?.trim() ||
      process.env.CONVEX_URL?.trim() ||
      "";

    devChildren.push(
      runAgentDev({
        appEnv: {
          BUN_PUBLIC_CONVEX_URL: publicConvexUrl,
          BUN_PUBLIC_ACCOUNT_TOKEN: process.env.BUN_PUBLIC_ACCOUNT_TOKEN,
          PORT: process.env.APPS_AGENT_PORT,
        },
        packageRoot: path.join(monorepoRoot, "apps/agent"),
      }),
    );
    devChildren.push(
      runExecutorDev({
        appEnv: {
          CONVEX_URL: process.env.CONVEX_URL,
          BUN_PUBLIC_CONVEX_URL: publicConvexUrl,
          PORT: process.env.APPS_EXECUTOR_PORT,
        },
        packageRoot: path.join(monorepoRoot, "apps/executor"),
      }),
    );
  } catch (err) {
    console.error(err);
    shutdownAll();
    await Promise.allSettled(devChildren.map((c) => c.exited));
    process.exit(1);
  }

  const firstChildExit = Promise.race(
    devChildren.map(async (c, i) => {
      const code = await c.exited;
      return { i, code } as const;
    }),
  );

  const onSignal = new Promise<"signal">((resolve) => {
    const h = () => resolve("signal");
    process.on("SIGINT", h);
    process.on("SIGTERM", h);
  });

  let outcome: { i: number; code: number } | "signal";
  try {
    outcome = await Promise.race([firstChildExit, onSignal]);
  } catch (err) {
    console.error(err);
    shutdownAll();
    await Promise.allSettled(devChildren.map((c) => c.exited));
    process.exit(1);
  }

  shutdownAll();
  await Promise.allSettled(devChildren.map((c) => c.exited));

  if (outcome === "signal") {
    process.exit(0);
  }
  process.exit(outcome.code !== 0 ? outcome.code : 0);
}

main().catch((err) => {
  console.error(err);
  killAll(devChildren);
  process.exit(1);
});
