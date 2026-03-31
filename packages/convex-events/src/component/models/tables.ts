import { defineTable } from "convex/server";
import { dimensions } from "../../domain/dimensions/tables";
import {
  eventEntryFields,
  eventProjectorCheckpointFields,
  eventStreamFields,
  eventStreamMetricFields,
} from "./fields";

const eventStreams = defineTable(eventStreamFields).index("by_stream", [
  "streamType",
  "namespace",
  "streamId",
]);

const eventEntries = defineTable(eventEntryFields)
  .index("by_global_sequence", ["globalSequence"])
  .index("by_stream_version", [
    "streamType",
    "namespace",
    "streamId",
    "streamVersion",
  ])
  .index("by_stream_event_time", [
    "streamType",
    "namespace",
    "streamId",
    "eventTime",
  ])
  .index("by_stream_event", ["streamType", "namespace", "streamId", "eventId"])
  .index("by_type_sequence", ["streamType", "globalSequence"])
  .index("by_namespace_eventType_time", [
    "namespace",
    "eventTypeId",
    "eventTime",
  ])
  .index("by_namespace_streamType_time", [
    "namespace",
    "streamTypeId",
    "eventTime",
  ]);

const eventStreamMetrics = defineTable(eventStreamMetricFields).index(
  "by_name_key",
  ["name", "groupKey"],
);

const eventProjectorCheckpoints = defineTable(
  eventProjectorCheckpointFields,
).index("by_projector_stream", ["projector", "streamType"]);

export const componentTables = {
  dimensions: dimensions,
  event_streams: eventStreams,
  event_entries: eventEntries,
  event_stream_metrics: eventStreamMetrics,
  event_projector_checkpoints: eventProjectorCheckpoints,
} as const;
