import type {
  EventStreamTemplate,
  MetricGroupByField,
  MetricMatchFields,
} from "../../component/types.js";

/** Bucket key when `groupBy` is empty (single global FIFO). */
export const GLOBAL_FIFO_BUCKET_KEY = "__global__";

export function matchesRule<Streams extends readonly EventStreamTemplate[]>(
  match: MetricMatchFields<Streams>,
  entry: { namespace: string; streamType: string; eventType: string },
): boolean {
  if (match.namespace !== undefined && match.namespace !== entry.namespace)
    return false;
  if (match.name !== undefined && match.name !== entry.streamType) return false;
  if (match.eventType !== undefined && match.eventType !== entry.eventType)
    return false;
  return true;
}

export function buildGroupKey(
  groupBy: MetricGroupByField[],
  entry: {
    namespace: string;
    streamType: string;
    streamId: string;
    eventType: string;
  },
): string {
  if (groupBy.length === 0) return GLOBAL_FIFO_BUCKET_KEY;
  const map: Record<MetricGroupByField, string> = {
    namespace: entry.namespace,
    name: entry.streamType,
    streamId: entry.streamId,
    eventType: entry.eventType,
  };
  if (groupBy.length === 1) return map[groupBy[0] as MetricGroupByField];
  return groupBy.map((f) => map[f as MetricGroupByField]).join("\0");
}

/**
 * FIFO bucket identity including rule index so overlapping `groupBy` keys under
 * different rules do not share counters.
 */
export function fifoBucketKeyForRule(
  ruleIndex: number,
  groupBy: MetricGroupByField[],
  entry: {
    namespace: string;
    streamType: string;
    streamId: string;
    eventType: string;
  },
): string {
  return `${ruleIndex}\0${buildGroupKey(groupBy, entry)}`;
}
