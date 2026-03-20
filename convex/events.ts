import { components } from "./_generated/api";
import { EventsClient } from "./components/events/client";
import { eventsConfig } from "./events.config";

export const events = new EventsClient(components.events, eventsConfig);
