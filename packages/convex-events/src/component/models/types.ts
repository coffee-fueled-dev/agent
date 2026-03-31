import type { Infer } from "convex/values";
import type {
  vEventDimension,
  vEventEntry,
  vEventProjectorCheckpoint,
  vEventStream,
  vEventStreamMetric,
} from "./validators";

export type EventDimensionDoc = Infer<typeof vEventDimension>;
export type EventStreamDoc = Infer<typeof vEventStream>;
export type EventEntryDoc = Infer<typeof vEventEntry>;
export type EventStreamMetricDoc = Infer<typeof vEventStreamMetric>;
export type EventProjectorCheckpointDoc = Infer<
  typeof vEventProjectorCheckpoint
>;
