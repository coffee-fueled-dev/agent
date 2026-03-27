import { v } from "convex/values";
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
      payloads: {
        turn_bound: {
          messageId: v.string(),
          codeId: v.string(),
          registrationId: v.string(),
          staticVersionId: v.string(),
          runtimeVersionId: v.string(),
          staticHash: v.string(),
          runtimeHash: v.string(),
        },
        registration_seen: {
          messageId: v.string(),
          codeId: v.string(),
          registrationId: v.string(),
        },
        static_version_created: {
          messageId: v.string(),
          codeId: v.string(),
          staticVersionId: v.string(),
          staticHash: v.string(),
        },
        runtime_version_created: {
          messageId: v.string(),
          codeId: v.string(),
          runtimeVersionId: v.string(),
          runtimeHash: v.string(),
        },
      },
    },
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
} as const satisfies EventsConfig;
