import { $ } from "bun";

const dev = Bun.spawn({ cmd: ["bunx", "convex", "dev"] });

const res = await $`bunx convex env set --from-file .env.convex`;
