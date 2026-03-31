import { EventsClient } from "@very-coffee/convex-events";
import { v } from "convex/values";
import { components } from "./_generated/api";

const eventActorArgs = v.optional(
  v.object({
    type: v.string(),
    id: v.string(),
  }),
);

export const events = new EventsClient(components.events, {
  streams: [
    {
      namespaceScoped: true,
      streamType: "memories",
      eventTypes: ["search_hit", "view", "create", "update", "delete"],
      payloads: {
        search_hit: {
          rank: v.number(),
          score: v.number(),
          actor: eventActorArgs,
        },
        view: {
          actor: eventActorArgs,
        },
        create: {
          actor: eventActorArgs,
          key: v.string(),
        },
        update: {
          actor: eventActorArgs,
          lastVersionId: v.string(),
        },
        delete: {
          actor: eventActorArgs,
        },
      },
    },
  ],
  metrics: [
    {
      name: "search_hit_count",
      match: { streamType: "memories", eventType: "search_hit" },
      groupBy: ["streamId"],
    },
    {
      name: "view_count",
      match: { streamType: "memories", eventType: "view" },
      groupBy: ["streamId"],
    },
  ],
});
