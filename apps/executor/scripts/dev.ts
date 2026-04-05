import { z } from "zod";
import { pipeChildStream } from "../../../scripts/_lib.ts";

export const executorDevAppEnvSchema = z
  .object({
    HOSTNAME: z.string().optional(),
    EXECUTOR_LISTEN_HOST: z.string().optional(),
    EXECUTOR_LISTEN_PORT: z.string().optional(),
    CONVEX_URL: z.string().optional(),
    BUN_PUBLIC_CONVEX_URL: z.string().optional(),
    PORT: z.string().optional(),
  })
  .refine(
    (e) =>
      (e.CONVEX_URL !== undefined && e.CONVEX_URL.length > 0) ||
      (e.BUN_PUBLIC_CONVEX_URL !== undefined &&
        e.BUN_PUBLIC_CONVEX_URL.length > 0),
    { message: "Set CONVEX_URL or BUN_PUBLIC_CONVEX_URL" },
  );

type AppEnv = z.infer<typeof executorDevAppEnvSchema>;

export type ExecutorDevOptions = {
  appEnv: AppEnv;
  /** App package root (`apps/executor`). */
  packageRoot: string;
  /** Monorepo root `.env.local` (same as agent dev). */
  repoEnvFile?: string;
};

export function runDev(opts: ExecutorDevOptions): Bun.Subprocess {
  const { appEnv, packageRoot, repoEnvFile } = opts;
  executorDevAppEnvSchema.parse(appEnv);

  const port = appEnv.PORT ?? "3010";
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
