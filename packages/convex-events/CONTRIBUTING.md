# Developing guide

## Running locally

```sh
bun install
bun run dev
```

## Testing

```sh
bun install --frozen-lockfile
bun run clean
bun run typecheck
bun test
```

Tests use [Bun's built-in test runner](https://bun.com/docs/test) (`bun:test`). Convex's `convex-test` expects Vite's `import.meta.glob`; this package provides `importMetaGlob` from `@very-coffee/convex-events/test` (see [src/importMetaGlob.ts](src/importMetaGlob.ts)).

Use `bun install` without `--frozen-lockfile` if you do not have a `bun.lock` yet.
