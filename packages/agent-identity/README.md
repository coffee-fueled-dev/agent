# @very-coffee/agent-identity

Framework-agnostic **agent identity** and **capability graph** primitives:

- Static tool/toolkit graph (known at build time)
- Async **policy** nodes (runtime pruning); policies dedupe by object identity
- **[Standard Schema](https://standardschema.dev)**-compatible `inputSchema` on tools (no runtime schema dependency in the core; types are vendored locally)
- **Zero runtime dependencies** (`dependencies` is empty)

## API

- `defineAgentIdentity` — register static props for identity snapshots
- `normalizeStaticProps` / `hashIdentityInput` — deterministic JSON snapshots
- `policy(id, evaluate)` — reusable policy objects
- `tool({ name, description, inputSchema, instructions, policies, handler })`
- `toolkit([...members], { name, instructions? })`
- `dynamicToolkit({ name, policies?, instructions?, create })`
- `evaluateComposable(composable, ctx)` — `ToolkitContext` is `{ env, namespace?, agentId?, agentName? }`
- `createIdentityLink(agent, evaluated, options?)` — pure **attribution** object (`IdentityLink`) with `staticHash` / `runtimeHash` tying the registered agent to a toolkit evaluation. Optional `includeSnapshots: true` adds normalized JSON snapshots. No persistence; consumers store it in Convex (or elsewhere) if needed.

## Registration and static hashing

- `hashToolStaticIdentity(staticProps)` — SHA-256 of normalized **tool** static props (same pipeline as `hashIdentityInput`).
- `hashToolComposableStatic(composable)` — same, for a composable whose `staticProps.kind` is `"tool"` (throws otherwise).
- `createToolRegistry()` — in-memory map: `register(key, staticProps)` returns the hash; `get` / `getByHash` / `has` / `listKeys` / `entries`. Duplicate keys: **last register wins**. Same hash under different keys: `getByHash` returns the **last** registered entry for that hash.
- `createAgentRegistry()` — keyed by `agentId`: `register(agent)` returns `{ staticHash }`; `get` / `has` / `listKeys` / `entries`. Duplicate `agentId`: **last register wins**.

## Examples (Vercel AI SDK consumer)

Examples live under `examples/`

```bash
bun run example:static
bun run example:dynamic
bun run example:identity
```

`examples/toAiSdk.ts` maps evaluated `ToolSpec` values to `tool()` from the AI SDK.

## Tests

```bash
bun test
```
