import path from "node:path";

const root = path.join(import.meta.dir, "..");

const convex = Bun.spawn({
  cmd: ["bunx", "convex", "dev", "--typecheck-components"],
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

function shutdown() {
  convex.kill();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

const code = await convex.exited;
shutdown();
process.exit(code);
