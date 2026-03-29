/**
 * Spawn `bunx convex …` with repo cwd and env (nvm Node on PATH from `withConvexNodeEnv`).
 */
export function spawnConvex(
  args: string[],
  cwd: string,
  env: Record<string, string | undefined>,
) {
  return Bun.spawn(["bunx", "convex", ...args], {
    cwd,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}

export function forwardSignalsToChild(child: ReturnType<typeof spawnConvex>) {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

export async function runConvexExit(
  args: string[],
  cwd: string,
  env: Record<string, string | undefined>,
): Promise<number> {
  const child = spawnConvex(args, cwd, env);
  forwardSignalsToChild(child);
  return await child.exited;
}
