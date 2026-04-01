import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "../_generated/api.js";

export const graphCounters = new ShardedCounter<string>(
  components.shardedCounter,
  {
    defaultShards: 4,
  },
);

/** Sharded counter name for incident edge count per node (former `graph_node_stats.totalDegree`). */
export function nodeTotalDegreeKey(nodeKey: string): string {
  return `nodeTotal:${nodeKey}`;
}
