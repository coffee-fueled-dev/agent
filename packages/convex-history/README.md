# `@very-coffee/convex-history`

Exact causal history component for Convex: immutable entries in a DAG, normalized parent edges, and stream heads for cheap reads of the current frontier.

## Install

```json
{
  "dependencies": {
    "@very-coffee/convex-history": "workspace:*"
  }
}
```

Mount at the app root (and optionally under parent components):

```ts
import history from "@very-coffee/convex-history/convex.config.js";

const app = defineApp();
app.use(history);
```

## Config and client

```ts
import type { HistoryConfig } from "@very-coffee/convex-history/types";
import { HistoryClient } from "@very-coffee/convex-history";
import { components } from "./convex/_generated/api";

export const historyConfig = {
  streams: [
    { streamType: "contextEntry", kinds: ["created", "edited"] },
  ],
} as const satisfies HistoryConfig;

export const history = new HistoryClient(components.history, historyConfig);
```

`HistoryClient.append` validates `streamType` / `kind` against this config **before** calling the component mutation. Calls that go directly to `components.history.public.append.append` do not run that allowlist; use `HistoryClient` for enforcement.

## API

Use `history.append`, `history.getEntry`, `history.listEntries`, `history.getPathToRoot`, `history.listHeads`, etc. (see `HistoryClient` in `src/client/index.ts`).

Provenance (who wrote an entry, tool attribution, etc.) is **not** part of this component’s schema: pass optional `attrs` on append with whatever flat key/value convention your app uses.

## Testing

`convex-test`: `registerComponent("history", schema, modules)` — see `src/test.ts`.
