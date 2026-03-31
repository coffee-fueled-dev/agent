import { EventsClient } from "@very-coffee/convex-events";
import { v } from "convex/values";
import { components } from "./_generated/api";

export const events = new EventsClient(components.events, {
  streams: [
    {
      namespaceScoped: true,
      streamType: "agent_identity",
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
      streamType: "agent_tools",
      eventTypes: [
        "policy_eval_started",
        "policy_eval_succeeded",
        "policy_eval_failed",
        "tool_started",
        "tool_succeeded",
        "tool_failed",
      ],
      payloads: {
        policy_eval_started: {
          policyId: v.string(),
          messageId: v.string(),
        },
        policy_eval_succeeded: {
          policyId: v.string(),
          messageId: v.string(),
        },
        policy_eval_failed: {
          policyId: v.string(),
          messageId: v.string(),
          error: v.string(),
        },
        tool_started: {
          toolName: v.string(),
          messageId: v.string(),
        },
        tool_succeeded: {
          toolName: v.string(),
          messageId: v.string(),
          output: v.any(),
        },
        tool_failed: {
          toolName: v.string(),
          messageId: v.string(),
          error: v.string(),
        },
      },
    },
  ],
});
