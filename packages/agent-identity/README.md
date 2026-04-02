# @very-coffee/agent-identity

Framework-agnostic **agent identity** and **capability graph** primitives:

- Static tool/toolkit graph (known at build time)
- Async **policy** nodes (runtime pruning); policies dedupe by object identity
- **[Standard Schema](https://standardschema.dev)**-compatible `inputSchema` on tools (no runtime schema dependency in the core; types are vendored locally)
- **Bottom-up SHA-256** identity: each composable implements `computeStaticHash()` from semantic fields (JSON Schema for `inputSchema` via `toJSONSchema()` when present), not deep object walks
- **Zero runtime dependencies** (`dependencies` is empty)

## API

- `defineAgentIdentity({ agentId, name, staticHash })` — `staticHash` from `await rootComposable.computeStaticHash()`
- `hashPlainObject` / `schemaToHashInput` — building blocks for canonical JSON hashing
- `collectToolStaticHashes(root)` — map of tool name → leaf static hash (walks `childComposables` on toolkits)
- `computeRuntimeHash(enabledNames, nameToStaticHash, tools)` — runtime identity for enabled tools only
- `hashToolSpecIdentity(spec)` — hash a `ToolSpec` (e.g. dynamic-only tools)
- `createIdentityLink({ agent, enabledToolNames, nameToStaticHash, tools })` — `IdentityLink` with `staticHash` / `runtimeHash`
- `policy(id, evaluate)` — reusable policy objects
- `tool({ name, description, inputSchema, instructions, policies, handler })` — returns composable with `computeStaticHash()`
- `toolkit([...members], { name, instructions? })` — Merkle-style hash over sorted member `{ name, hash }` pairs
- `dynamicToolkit({ name, policies?, instructions?, create })` — static hash includes name + instructions + policy ids only
- `evaluateComposable(composable, ctx)` — `ToolkitContext` is `{ env, namespace?, agentId?, agentName? }`

## Registration and static hashing

- `hashToolComposableStatic(composable)` — for composables whose `staticProps.kind` is `"tool"` (throws otherwise); delegates to `computeStaticHash()`.
- `createToolRegistry()` — `register(key, composable)`; `get` / `getByHash` / `has` / `listKeys` / `entries`. Duplicate keys: **last register wins**.
- `createAgentRegistry()` — `register(agent)` stores `RegisteredAgentIdentity`; `get` / `has` / `listKeys` / `entries`. Duplicate `agentId`: **last register wins**.

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
