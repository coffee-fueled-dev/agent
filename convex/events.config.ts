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
        "policy_eval_started",
        "policy_eval_result",
        "tool_started",
        "tool_succeeded",
        "tool_failed",
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
        policy_eval_started: {
          policyId: v.string(),
          messageId: v.string(),
        },
        policy_eval_result: {
          policyId: v.string(),
          messageId: v.string(),
          ok: v.boolean(),
        },
        tool_started: {
          toolName: v.string(),
          messageId: v.string(),
        },
        tool_succeeded: {
          toolName: v.string(),
          messageId: v.string(),
        },
        tool_failed: {
          toolName: v.string(),
          messageId: v.string(),
          error: v.string(),
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
