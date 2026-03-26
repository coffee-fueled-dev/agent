import { EventsClient } from "../../events/client";
import { components } from "../_generated/api";

const eventsConfig = {
  streams: [
    {
      streamType: "contextMemory",
      eventTypes: ["searched", "viewed", "added", "edited", "deleted"],
    },
  ],
} as const;

export const memoryEvents = new EventsClient(components.events, eventsConfig);
