# Memory component

App-owned Convex component under `convex/components/memory` with isolated tables (not app `schema.ts` tables).

## Layers

- **Memory core** (`public/core.ts`): stable `memoryId` (aligned with RAG entry id), `sourceRef` mapping, canonical detail via `getMemory()`, version snapshots in history; paginated reads via `listVersionsPage()` + `recallVersion(entryId)`.
- **Retrieval indexes**: lexical via `@very-coffee/convex-search-features`, vectors via `@convex-dev/rag`, embeddings table for batch graph.
- **Graph** (`public/graph.ts`): `SIMILAR_TO` edges, online similarity scheduling, batch kNN + Leiden community jobs.
- **Retrieval orchestrator** (`public/retrieval.ts`): hybrid lexical + vector + optional file vectors + graph expansion + `@very-coffee/reciprocal-rank-fusion`.
- **Client** (`client/index.ts`): `MemoryClient` with stable verbs.

## Host registration

Registered in root [`convex/convex.config.ts`](../convex.config.ts) via `app.use(memory)`. Wire `components.memory` in the host app and use `new MemoryClient(components.memory, { googleApiKey })`.

## Codegen

Run `npx convex dev` (or project codegen) to refresh `convex/components/memory/_generated/*` stubs.
