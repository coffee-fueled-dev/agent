import { EventsClient } from "@very-coffee/convex-events";
import { createEventBus } from "@very-coffee/convex-events/eventBus";
import type { EventsConfig } from "@very-coffee/convex-events/types";
import { v } from "convex/values";
import { components } from "./_generated/api";

export const eventsConfig = {
  streams: [
    {
      streamType: "todo",
      eventTypes: ["created", "completed", "deleted"],
      payloads: {
        created: { title: v.string() },
        completed: { title: v.string() },
        deleted: { title: v.string() },
      },
    },
    {
      streamType: "counter",
      eventTypes: ["incremented", "decremented"],
    },
  ],
  metrics: [
    {
      name: "todo_by_type",
      match: { streamType: "todo" },
      groupBy: ["eventType"],
    },
    {
      name: "counter_total",
      match: { streamType: "counter" },
      groupBy: ["streamId"],
    },
  ],
} as const satisfies EventsConfig;

export const events = new EventsClient(components.events, eventsConfig);

const { listener, tables } = createEventBus({
  sources: [{ client: events, key: "events" }],
  eviction: { type: "fifo", options: { size: 500 } },
});
export const bus = listener;
export const busTables = tables;
