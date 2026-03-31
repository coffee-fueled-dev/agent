import { v } from "convex/values";
import { withSystemFields } from "convex-helpers/validators";
import { dimensionFields } from "../../domain/dimensions/fields";
import {
  eventEntryFields,
  eventProjectorCheckpointFields,
  eventStreamFields,
  eventStreamMetricFields,
} from "./fields";

export const vEventDimension = v.object(
  withSystemFields("dimensions", dimensionFields),
);

export const vEventStream = v.object(
  withSystemFields("event_streams", eventStreamFields),
);

export const vEventEntry = v.object(
  withSystemFields("event_entries", eventEntryFields),
);

export const vEventStreamMetric = v.object(
  withSystemFields("event_stream_metrics", eventStreamMetricFields),
);

export const vEventProjectorCheckpoint = v.object(
  withSystemFields(
    "event_projector_checkpoints",
    eventProjectorCheckpointFields,
  ),
);
