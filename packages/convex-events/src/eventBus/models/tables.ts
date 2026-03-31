import { defineTable } from "convex/server";
import { dimensionsTables } from "../../domain/dimensions/tables";
import {
  eventBusCountFields,
  eventBusEntryFields,
  eventBusEvictionBufferFields,
} from "./fields";

export const eventBusEntries = defineTable(eventBusEntryFields)
  .index("by_source_event", ["sourceKey", "eventId"])
  .index("by_time", ["eventTime"])
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
  ]);

export const eventBusEvictionBuffer = defineTable(eventBusEvictionBufferFields);

export const eventBusCount = defineTable(eventBusCountFields);

export const fifoTables = {
  ...dimensionsTables,
  eventBusEntries,
  eventBusEvictionBuffer,
  eventBusCount,
} as const;
