import { v } from "convex/values";
import { withSystemFields } from "convex-helpers/validators";
import {
  eventBusCountFields,
  eventBusDimensionFields,
  eventBusEntryFields,
  eventBusEvictionBufferFields,
} from "./fields";

export const vEventBusDimension = v.object(
  withSystemFields("eventBusDimensions", eventBusDimensionFields),
);

export const vEventBusEntry = v.object(
  withSystemFields("eventBusEntries", eventBusEntryFields),
);

export const vEventBusEvictionBuffer = v.object(
  withSystemFields("eventBusEvictionBuffer", eventBusEvictionBufferFields),
);

export const vEventBusCount = v.object(
  withSystemFields("eventBusCount", eventBusCountFields),
);
