import { v } from "convex/values";
import { EventsClient } from "../../events/client";
import { components } from "../_generated/api";

const eventsConfig = {
  streams: [
    {
      streamType: "contextMemory",
      namespaceScoped: true,
      eventTypes: ["searched", "viewed", "added", "edited", "deleted"],
      payloads: {
        searched: {
          namespace: v.string(),
          rank: v.number(),
          score: v.number(),
        },
        viewed: { namespace: v.string() },
        added: { namespace: v.string(), key: v.string() },
        edited: { namespace: v.string(), oldEntryId: v.string() },
        deleted: { namespace: v.string() },
      },
    },
  ],
} as const;

export const memoryEvents = new EventsClient(components.events, eventsConfig);
