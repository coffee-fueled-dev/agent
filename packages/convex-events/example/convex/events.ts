import { EventsClient } from "@very-coffee/convex-events";
import type { EvictionPolicy } from "@very-coffee/convex-events/eventBus";
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
      name: "todo_by_namespace",
      match: { name: "todo" },
      groupBy: ["namespace"],
    },
    {
      name: "counter_total",
      match: { name: "counter" },
      groupBy: ["streamId"],
    },
  ],
} as const satisfies EventsConfig;

export const events = new EventsClient(components.events, eventsConfig);

/**
 * First matching rule wins (ordered). Todo and counter are handled by rules 0–1;
 * the catch-all (rule 2) only applies to **other** stream names — not an extra cap
 * on todo/counter traffic.
 */
export const fifoEvictionRules: EvictionPolicy["rules"] = [
  { match: { name: "todo" }, groupBy: ["namespace"], size: 500 },
  { match: { name: "counter" }, groupBy: [], size: 500 },
  { match: {}, groupBy: ["namespace"], size: 500 },
];

const { listener, tables } = createEventBus({
  sources: [{ client: events, key: "events" }],
  eviction: {
    type: "fifo",
    rules: fifoEvictionRules,
  },
});
export const bus = listener;
export const busTables = tables;
