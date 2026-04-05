# Executor app config

HTTP listen, public tooling origin for Convex, route paths, and path defaults are defined in [`@agent/config`](../../packages/config) (`executorHttpRoutes`, `loadMonorepoConfig`, defaults). Override via root `.env.local` — see [`config/env.example`](../../config/env.example).

Secrets remain in `.env.local` and are pushed to Convex via `scripts/convex.ts`.
