# `@very-coffee/convex-graph`

Convex component for labeled nodes, edges, and sharded counters (global node/edge counts, **per-node incident degree** via keyed counter names `nodeTotal:${nodeKey}`), plus an optional aggregate for degree distributions.

## Install

In a monorepo workspace:

```json
{
  "dependencies": {
    "@very-coffee/convex-graph": "workspace:*"
  }
}
```

The component depends on **`@convex-dev/aggregate`** and **`@convex-dev/sharded-counter`** (declared as dependencies of this package). Mount it from your app or parent component:

```ts
import graph from "@very-coffee/convex-graph/convex.config.js";

const component = defineComponent("myApp");
component.use(graph);
```

## Client usage

```ts
import { GraphClient, edgeSchema, nodeSchema, buildKnnGraph, leiden, normalizeLabel } from "@very-coffee/convex-graph";

const graph = new GraphClient(components.graph, {
  nodes: [nodeSchema(schema, "contextEntry", "contextEntries")],
  edges: [edgeSchema("SIMILAR_TO", undefined, { directed: false })],
});
```

Pure helpers (`buildKnnGraph`, `leiden`, `normalizeLabel`) live outside the Convex function tree so they are not registered as Convex modules.

## Schema and stats

Tables: `graph_labels`, `graph_nodes`, `graph_edges`. Per-node **`totalDegree`** is stored in the sharded-counter component under `nodeTotal:${nodeKey}` (updated synchronously when edges change). `getNodeStats` returns `inDegree` and `outDegree` as `0` until separate tracking is added.

**Breaking changes:** Removing `graph_node_stats` and `graph_pending_degree_updates` requires redeploying component data or accepting empty state.

## Testing

`convex-test` can register this component with `registerComponent("graph", schema, modules)` (see `src/test.ts`). Nested child components (aggregate, sharded counter) are configured in `convex.config.ts` the same way as in production.
