import { EventsClient } from "@very-coffee/convex-events";
import { createEventBus } from "@very-coffee/convex-events/eventBus";
import type { EventsConfig } from "@very-coffee/convex-events/types";
import { type PropertyValidators, v } from "convex/values";
import { components } from "./_generated/api";

export const eventsConfig = {
  streams: [
    {
      name: "todo",
      events: {
        created: { title: v.string() },
        completed: { title: v.string() },
        deleted: { title: v.string() },
      },
    },
    {
      name: "counter",
      events: {
        incremented: v.object({}) as unknown as PropertyValidators,
        decremented: v.object({}) as unknown as PropertyValidators,
      },
    },
  ],
  counters: [
    {
      name: "todo_by_type",
      match: { name: "todo" },
      groupBy: ["eventType"],
    },
    {
      name: "counter_total",
      match: { name: "counter" },
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
