import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { z } from "zod";

export const zMachineAgentRegistration = z.object({
  codeId: z.string(),
  name: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  latestStaticHash: z.string(),
  latestRuntimeHash: z.string(),
});

export const machineAgentRegistrations = defineTable(
  zodOutputToConvex(zMachineAgentRegistration),
).index("by_codeId", ["codeId"]);

export const zMachineAgentStaticVersion = z.object({
  registrationId: z.string(),
  codeId: z.string(),
  staticHash: z.string(),
  snapshot: z.any(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
});

export const machineAgentStaticVersions = defineTable(
  zodOutputToConvex(zMachineAgentStaticVersion),
)
  .index("by_registrationId_staticHash", ["registrationId", "staticHash"])
  .index("by_codeId_createdAt", ["codeId", "createdAt"]);

export const zMachineAgentRuntimeVersion = z.object({
  registrationId: z.string(),
  staticVersionId: z.string(),
  codeId: z.string(),
  runtimeHash: z.string(),
  snapshot: z.any(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
});

export const machineAgentRuntimeVersions = defineTable(
  zodOutputToConvex(zMachineAgentRuntimeVersion),
)
  .index("by_staticVersionId_runtimeHash", ["staticVersionId", "runtimeHash"])
  .index("by_codeId_createdAt", ["codeId", "createdAt"]);

export const zMachineAgentTurnBinding = z.object({
  codeId: z.string(),
  registrationId: z.string(),
  staticVersionId: z.string(),
  runtimeVersionId: z.string(),
  threadId: z.string(),
  messageId: z.string(),
  sessionId: z.string().optional(),
  recordedAt: z.number(),
});

export const machineAgentTurnBindings = defineTable(
  zodOutputToConvex(zMachineAgentTurnBinding),
)
  .index("by_messageId", ["messageId"])
  .index("by_threadId_recordedAt", ["threadId", "recordedAt"])
  .index("by_codeId_recordedAt", ["codeId", "recordedAt"]);
