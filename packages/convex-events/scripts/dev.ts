import path from "node:path";

const root = path.join(import.meta.dir, "..");

const convex = Bun.spawn({
  cmd: ["bunx", "convex", "dev", "--typecheck-components"],
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

const web = Bun.spawn({
  cmd: ["bun", "--hot", path.join(root, "example/src/index.ts")],
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

function shutdown() {
  convex.kill();
  web.kill();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

const code = await Promise.race([convex.exited, web.exited]);
shutdown();
process.exit(code);
