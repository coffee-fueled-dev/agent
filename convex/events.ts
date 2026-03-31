import { EventsClient as EventsClientV2 } from "@very-coffee/convex-events";
import { createEventBus } from "@very-coffee/convex-events/eventBus";
import { components } from "./_generated/api";
import { EventsClient as EventsClientV1 } from "./components/events/client";
import { eventsConfig } from "./events.config";

export const events = new EventsClientV1(components.events, eventsConfig);

export const eventsV2 = new EventsClientV2(components.events, eventsConfig);

const { listener, tables } = createEventBus({
  eviction: { type: "fifo", options: { size: 1000 } },
  sources: [{ client: eventsV2, key: "events" }],
});
