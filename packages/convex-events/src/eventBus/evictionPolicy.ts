import type {
  EventStreamTemplate,
  MetricGroupByField,
  MetricMatchFields,
} from "../component/types.js";

/**
 * One FIFO scope: events matching `match` are counted/evicted in buckets keyed by
 * `groupBy` (same strings as {@link MetricRule}), with at most `size` rows per bucket.
 * Ordered rules: **first matching rule** applies (unlike `counters`, where all matches increment).
 */
export type FifoEvictionRule<
  Streams extends readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  match: MetricMatchFields<Streams>;
  groupBy: MetricGroupByField[];
  size: number;
};

export type EvictionPolicy<
  Streams extends readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  type: "fifo";
  rules: FifoEvictionRule<Streams>[];
};
