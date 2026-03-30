import { v } from "convex/values";
import {
  logContextMemoryCheckpoint,
  onContextMemoryAppend,
} from "../../context/contextMemoryEventHooks";
import { EventsClient } from "../events/client";
import { components } from "./_generated/api";

export const memoryEvents = new EventsClient(components.events, {
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
  ] as const,

  metrics: [
    {
      name: "searchCount",
      match: { streamType: "contextMemory", eventType: "searched" },
      groupBy: ["streamId"],
    },
    {
      name: "viewCount",
      match: { streamType: "contextMemory", eventType: "viewed" },
      groupBy: ["streamId"],
    },
  ],

  onAdvanceCheckpoint: (ctx, checkpoint) => {
    logContextMemoryCheckpoint(ctx, checkpoint);
  },
});

memoryEvents.subscribe("contextMemoryBridge", (ctx, entry) => {
  void onContextMemoryAppend(ctx, entry);
});
