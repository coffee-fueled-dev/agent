import type { EventsConfig } from "./components/events/types";

export const eventsConfig = {
  streams: [
    {
      streamType: "threadIdentity",
      eventTypes: [
        "turn_bound",
        "registration_seen",
        "static_version_created",
        "runtime_version_created",
      ],
    },
  ],
} as const satisfies EventsConfig;
