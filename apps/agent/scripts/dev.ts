import { z } from "zod";
import { pipeChildStream } from "../../../scripts/_lib.ts";

export const agentDevAppEnvSchema = z.object({
  HOSTNAME: z.string().optional(),
  AGENT_LISTEN_HOST: z.string().optional(),
  AGENT_LISTEN_PORT: z.string().optional(),
  BUN_PUBLIC_CONVEX_URL: z.string().min(1),
  BUN_PUBLIC_ACCOUNT_TOKEN: z.string().min(1),
  PORT: z.string().optional(),
});

type AppEnv = z.infer<typeof agentDevAppEnvSchema>;

export type AgentDevOptions = {
  appEnv: AppEnv;
  /** App package root (`apps/agent`). */
  packageRoot: string;
  /**
   * Monorepo root `.env.local` — loaded first so `bun --hot` embeds public Convex vars
   * after `ensurePublicEnvInDotenvLocal` runs in the orchestrator.
   */
  repoEnvFile?: string;
};

export function runDev(opts: AgentDevOptions): Bun.Subprocess {
  const { appEnv, packageRoot, repoEnvFile } = opts;
  agentDevAppEnvSchema.parse(appEnv);

  const port = appEnv.PORT ?? "3000";
  const env = { ...process.env, ...appEnv, PORT: port };

  const cmd =
    repoEnvFile !== undefined
      ? ["bun", "--env-file", repoEnvFile, "--hot", "src/index.ts"]
      : ["bun", "--hot", "src/index.ts"];

  const subprocess = Bun.spawn({
    cmd,
    cwd: packageRoot,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  void pipeChildStream(subprocess.stdout, process.stdout);
  void pipeChildStream(subprocess.stderr, process.stderr);

  return subprocess;
}
