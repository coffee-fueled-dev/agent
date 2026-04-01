# `@very-coffee/convex-search-features`

Convex component for **lexical search** over denormalized text slices, with **canonical rows** that store an opaque **`sourceRef`** string (caller-defined link to the original entity).

- **`searchFeatureItems`**: identity + `sourceRef` + optional hooks (`bucketId` / `bucketType`, `supersededAt`, `sourceVersion`) for future grouping or lineage—not a general history index.
- **`searchFeatureTextSlices`**: one small document per searchable string (`propKey` + `text`); this table holds the **fulltext index** only.

Callers **upsert** canonical metadata and one or more text slices (`text` shorthand and/or `textSlices`). **Search** runs on the text table, dedupes by feature, and returns canonical fields plus the **matched** slice text and `matchedPropKey`.

Mount with `defineComponent().use(...)` (instance name remains `search` in `convex.config.ts` for stable `components.search`). Use `SearchClient` from the package entry point.

See `src/test.ts` for `convex-test` registration.
