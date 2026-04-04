# @very-coffee/convex-agent-fingerprints

Convex **component** plus a typed **`FingerprintClient`** for storing **capability fingerprints**: static and runtime hashes produced by [`@very-coffee/agent-identity`](https://github.com/coffee-fueled-dev/agent/tree/main/packages/agent-identity) (toolkit definitions, enabled tools after policies).

This package uses **fingerprint** naming in its public API. The underlying Convex functions and tables still use **identity** in a few places (`recordTurnIdentity`, `turnIdentityBindings`, etc.)—that is intentional: the component records *which agent definition and tool graph* applied at a point in time, not end-user authentication.

## What you get

- **Registration rows** for each `agentId` and `toolKey` with version history (static / tool hashes).
- **Evaluation bindings** that tie `staticHash`, `runtimeHash`, and per-tool refs to your app’s correlation ids (`threadId`, `messageId`, optional `sessionId`).

Hashes are always computed **in your app** (e.g. with `computeRuntimeIdentityFromEvaluation`); this component only **persists** the payloads and Convex-generated ids.

## Install

```bash
bun add @very-coffee/convex-agent-fingerprints @very-coffee/agent-identity convex
```

Peer deps: `convex`, `react` (for the optional `/react` subpath).

## Use in a Convex app

1. **Register the component** in your app’s `convex/convex.config.ts`:

   ```ts
   import { defineApp } from "convex/server";
   import agentFingerprints from "@very-coffee/convex-agent-fingerprints/convex.config";

   const app = defineApp();
   app.use(agentFingerprints);
   export default app;
   ```

2. **Wire the client** (e.g. `convex/clients/fingerprints.ts`):

   ```ts
   import { components } from "./_generated/api.js";
   import { FingerprintClient } from "@very-coffee/convex-agent-fingerprints";

   export const fingerprintClient = new FingerprintClient(
     components.agentFingerprints,
   );
   ```

3. **From a mutation or action**, register fingerprints and record an evaluation:

   ```ts
   await fingerprintClient.registerAgentAndTools(ctx, {
     agentId: "assistant",
     name: "Assistant",
     staticHash,
     tools: nameToHashMap,
   });

   await fingerprintClient.recordEvaluationForRegisteredAgent(ctx, {
     agent,
     runtimeHash,
     threadId,
     messageId,
     sessionId,
     tools: toolRefs,
   });
   ```

## API surface (`FingerprintClient`)

| Method | Purpose |
|--------|---------|
| `registerAgent` / `registerTool` | Upsert static fingerprint rows |
| `registerAgentAndTools` | Agent + all tools (e.g. from `collectToolStaticHashes`) |
| `recordEvaluation` | Store static + runtime + tool refs for one message/evaluation |
| `recordEvaluationForRegisteredAgent` | Same, using `RegisteredAgentIdentity` from agent-identity |
| `getRegisteredAgent` / `getRegisteredTool` | Latest registration docs |
| `listAgentStaticVersions` / `listToolVersions` / `listRuntimeVersionsForStaticVersion` | Version history |
| `getBindingForMessage` / `listBindingsForThread` | Read stored evaluation bindings |

## Deprecated alias

- `IdentityClient` is an alias for `FingerprintClient` (same class, older name).

## Subpath exports

| Import | Contents |
|--------|----------|
| `@very-coffee/convex-agent-fingerprints` | `FingerprintClient`, `IdentityClient` |
| `@very-coffee/convex-agent-fingerprints/react` | Same client re-exports for `"use client"` bundles |
| `@very-coffee/convex-agent-fingerprints/types` | `ComponentApi`, `RegisteredAgentIdentity`, `ToolSpec` |
| `@very-coffee/convex-agent-fingerprints/convex.config` | `defineComponent` default for `app.use()` |

## Scripts

```bash
bun run build          # compile to dist/
bun run build:codegen  # convex codegen for the component + build
bun test
bun run typecheck
```

## License

Apache-2.0
