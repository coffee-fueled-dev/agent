# Monorepo configuration

1. Run `bun install` at the repo root.
2. Copy [`env.example`](./env.example) to `.env.local` at the **repo root**, set secrets and any overrides.
3. **First-time Convex:** run `bun configure` once and complete the interactive `convex dev --configure` flow (project link, local or cloud deployment, etc.).
4. Run `bun dev` — loads [`@agent/config`](../packages/config), runs the Convex `env set` loop from `.env.local`, starts `convex dev`, then (if configured) the storage ngrok tunnel, agent, and executor. If Convex was never configured, `bun dev` exits and tells you to run `bun configure` first.

**Executor secrets (pairing Convex ↔ executor):** `FILE_EMBEDDING_SECRET`, `SHELL_EXECUTOR_SECRET`, and `BROWSER_EXECUTOR_SECRET` must each be the **same value** in the Convex deployment and in the executor’s environment. Convex includes them when calling `/api/file-embedding`, `/api/fs/*`, and `/api/browser/browse`; the executor validates them. If you set them only on one side, those HTTP calls fail (e.g. 401).

**Storage tunnel (optional):** Set `STORAGE_PUBLIC_TUNNEL_ORIGIN=auto` and `NGROK_AUTHTOKEN` in `.env.local` to start an ngrok edge to your Convex deployment origin after `convex dev` is ready; the orchestrator sets Convex `STORAGE_PUBLIC_TUNNEL_ORIGIN` to the discovered public HTTPS origin so file URLs in LLM messages are reachable. Use a literal URL instead of `auto` to skip ngrok and pin a fixed origin.

If you see **“Can't safely modify .env.local for CONVEX_URL”** from the Convex CLI, it often means `CONVEX_URL` and `BUN_PUBLIC_CONVEX_URL` share the same URL string (the CLI refuses ambiguous rewrites). That is expected in this repo: the agent’s Bun **browser** bundle only inlines `BUN_PUBLIC_*` per [`apps/agent/bunfig.toml`](../apps/agent/bunfig.toml), so the dev script must keep **`BUN_PUBLIC_CONVEX_URL=`** in `.env.local` even when it duplicates `CONVEX_URL`. The orchestrator runs the agent with `bun --env-file=<repo>/.env.local` so those values load for `bun --hot`.

Non-secret defaults (ports, route paths, optional feature-flag defaults) live in TypeScript under `packages/config`.
