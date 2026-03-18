# History

`history` is an exact causal history component for Convex.

It stores immutable entries in a DAG, keeps normalized parent edges for traversal, and maintains stream heads so apps can cheaply read the current frontier of a branchy history.

## Good Fit

Use it when you need:

- append-only event or revision history
- branch and merge structure
- ancestry checks
- exact structural heads per stream

Examples:

- document revision trees
- approval timelines with merges
- multi-actor workflow history
- event streams that later feed pattern analysis

## Non-Goals

This v1 does not try to own:

- legal next moves
- workflow execution
- continuation planning
- pattern sequencing

Those can be layered on later by keying additional state off `(streamType, streamId, entryId)`.

## App Config

Register stream types in app code:

```ts
import type { HistoryConfig } from "./components/history/types";

export const historyConfig = {
  streams: [
    {
      streamType: "document",
      kinds: ["created", "edited", "merged"],
    },
  ],
} as const satisfies HistoryConfig;
```

## Client

```ts
import { components } from "../_generated/api";
import { HistoryClient } from "./components/history/client";

const historyConfig = {
  streams: [
    {
      streamType: "document",
      kinds: ["created", "edited", "merged"],
    },
  ],
} as const;

export const history = new HistoryClient(components.history, historyConfig);
```

Write:

```ts
await history.append.append(ctx, {
  streamType: "document",
  streamId: docId,
  entryId: versionId,
  kind: "edited",
  parentEntryIds: [previousVersionId],
  payload: { title: "Draft 2" },
});
```

Read:

```ts
const heads = await history.heads.listHeads(ctx, {
  streamType: "document",
  streamId: docId,
});

const lineage = await history.read.getPathToRoot(ctx, {
  streamType: "document",
  streamId: docId,
  entryId: versionId,
});
```

`getPathToRoot` follows the primary parent chain using `parentOrder`, so merged histories remain deterministic without flattening the full ancestor subgraph.
