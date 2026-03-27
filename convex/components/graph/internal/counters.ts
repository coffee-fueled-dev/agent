import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "../_generated/api";

export const graphCounters = new ShardedCounter(components.shardedCounter, {
  defaultShards: 4,
});
