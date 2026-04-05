import { z } from "zod";
import { pipeChildStream } from "../../../scripts/_lib.ts";

export const agentDevAppEnvSchema = z.object({
  HOSTNAME: z.string().optional(),
  BUN_PUBLIC_CONVEX_URL: z.string().min(1),
  BUN_PUBLIC_ACCOUNT_TOKEN: z.string().min(1),
  PORT: z.string().optional(),
});

type AppEnv = z.infer<typeof agentDevAppEnvSchema>;

export type AgentDevOptions = {
  appEnv: AppEnv;
  /** App package root (`apps/agent`). */
  packageRoot: string;
};

export function runDev(opts: AgentDevOptions): Bun.Subprocess {
  const { appEnv, packageRoot } = opts;
  agentDevAppEnvSchema.parse(appEnv);

  const port = appEnv.PORT ?? "3000";
  const env = { ...process.env, ...appEnv, PORT: port };

  const subprocess = Bun.spawn({
    cmd: ["bun", "--hot", "src/index.ts"],
    cwd: packageRoot,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  void pipeChildStream(subprocess.stdout, process.stdout);
  void pipeChildStream(subprocess.stderr, process.stderr);

  return subprocess;
}
