import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const jsonValueValidator = v.any();

export default defineSchema({
  agentRegistrations: defineTable({
    agentId: v.string(),
    name: v.string(),
    latestStaticHash: v.string(),
    latestRuntimeHash: v.optional(v.string()),
    updatedAt: v.number(),
    metadata: v.optional(v.record(v.string(), jsonValueValidator)),
  }).index("by_agentId", ["agentId"]),

  agentStaticVersions: defineTable({
    registrationId: v.id("agentRegistrations"),
    staticHash: v.string(),
    staticSnapshot: v.optional(jsonValueValidator),
    createdAt: v.number(),
  })
    .index("by_registration_and_staticHash", ["registrationId", "staticHash"])
    .index("by_registration_createdAt", ["registrationId", "createdAt"]),

  agentRuntimeVersions: defineTable({
    staticVersionId: v.id("agentStaticVersions"),
    runtimeHash: v.string(),
    runtimeSnapshot: v.optional(jsonValueValidator),
    createdAt: v.number(),
  })
    .index("by_static_and_runtime", ["staticVersionId", "runtimeHash"])
    .index("by_static_createdAt", ["staticVersionId", "createdAt"]),

  toolRegistrations: defineTable({
    toolKey: v.string(),
    latestToolHash: v.string(),
    staticSnapshot: jsonValueValidator,
    updatedAt: v.number(),
    metadata: v.optional(v.record(v.string(), jsonValueValidator)),
  }).index("by_toolKey", ["toolKey"]),

  toolVersions: defineTable({
    registrationId: v.id("toolRegistrations"),
    toolHash: v.string(),
    staticSnapshot: jsonValueValidator,
    createdAt: v.number(),
  })
    .index("by_registration_and_toolHash", ["registrationId", "toolHash"])
    .index("by_registration_createdAt", ["registrationId", "createdAt"])
    .index("by_toolHash", ["toolHash"]),

  turnIdentityBindings: defineTable({
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.optional(v.string()),
    agentId: v.string(),
    agentName: v.string(),
    registrationId: v.id("agentRegistrations"),
    staticVersionId: v.id("agentStaticVersions"),
    runtimeVersionId: v.id("agentRuntimeVersions"),
    staticHash: v.string(),
    runtimeHash: v.string(),
    staticSnapshot: v.optional(jsonValueValidator),
    runtimeSnapshot: v.optional(jsonValueValidator),
    toolRefs: v.optional(
      v.array(
        v.object({
          toolKey: v.string(),
          toolHash: v.string(),
          toolVersionId: v.id("toolVersions"),
        }),
      ),
    ),
    createdAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_threadId", ["threadId"])
    .index("by_thread_createdAt", ["threadId", "createdAt"]),
});
