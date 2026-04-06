import { defineTable } from "convex/server";
import { dimensionsTables } from "../../domain/dimensions/tables";
import {
  eventBusCountFields,
  eventBusEntryFields,
  eventBusEvictionBufferFields,
} from "./fields";

export const eventBusEntries = defineTable(eventBusEntryFields)
  .index("by_source_event", ["sourceKey", "eventId"])
  .index("by_fifoBucketKey_time", ["fifoBucketKey", "eventTime"])
  .index("by_namespace_time", ["namespace", "eventTime"])
  .index("by_namespace_eventType_time", [
    "namespace",
    "eventTypeId",
    "eventTime",
  ])
  .index("by_namespace_streamType_time", [
    "namespace",
    "streamTypeId",
    "eventTime",
  ])
  .index("by_namespace_streamId_time", ["namespace", "streamId", "eventTime"]);

export const eventBusEvictionBuffer = defineTable(eventBusEvictionBufferFields);

export const eventBusCount = defineTable(eventBusCountFields).index(
  "by_bucketKey",
  ["bucketKey"],
);

export const fifoTables = {
  ...dimensionsTables,
  eventBusEntries,
  eventBusEvictionBuffer,
  eventBusCount,
} as const;
