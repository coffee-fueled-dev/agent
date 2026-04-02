# Identity component

App-owned Convex component with isolated tables for **agent** / **tool** registrations, version rows (static + runtime), and **per-turn identity bindings**. Only serializable payloads cross the component boundary; use `client/IdentityClient` from an action/mutation so `@very-coffee/agent-identity` hashing runs outside the component.

## Host registration

Mount in [`convex/convex.config.ts`](../../convex.config.ts) via `app.use(identity)`. Wire `components.identity` in the host app and use `new IdentityClient(components.identity)`.

## Layers

- **public/register.ts** — `registerAgent`, `registerTool`
- **public/record.ts** — `recordTurnIdentity` (upserts versions + turn row; idempotent per `messageId`)
- **public/queries.ts** — registrations, bounded version history, turn lookups
- **`client/index.ts`** — `IdentityClient` (forwards pre-computed `staticHash` / `runtimeHash` / per-tool refs from the host). See [`client/README.md`](./client/README.md).

## Codegen

Run `bunx convex codegen` from `packages/backend` (or `npx convex dev`) to refresh `_generated/*`.
