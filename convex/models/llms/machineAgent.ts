import { defineTable } from "convex/server";
import { zid, zodOutputToConvex } from "convex-helpers/server/zod4";
import { z } from "zod";

export const zMachineAgentRegistration = z.object({
  account: zid("accounts").optional(),
  codeId: z.string(),
  name: z.string(),
  lastSeenAt: z.number(),
  latestStaticHash: z.string(),
  latestRuntimeHash: z.string(),
});

export const machineAgentRegistrations = defineTable(
  zodOutputToConvex(zMachineAgentRegistration),
)
  .index("by_codeId", ["codeId"])
  .index("by_account", ["account"]);

export const zMachineAgentStaticVersion = z.object({
  registrationId: z.string(),
  codeId: z.string(),
  staticHash: z.string(),
  snapshot: z.any(),
  lastSeenAt: z.number(),
});

export const machineAgentStaticVersions = defineTable(
  zodOutputToConvex(zMachineAgentStaticVersion),
)
  .index("by_registrationId_staticHash", ["registrationId", "staticHash"])
  .index("by_codeId", ["codeId"]);

export const zMachineAgentRuntimeVersion = z.object({
  registrationId: z.string(),
  staticVersionId: z.string(),
  codeId: z.string(),
  runtimeHash: z.string(),
  snapshot: z.any(),
  lastSeenAt: z.number(),
});

export const machineAgentRuntimeVersions = defineTable(
  zodOutputToConvex(zMachineAgentRuntimeVersion),
)
  .index("by_staticVersionId_runtimeHash", ["staticVersionId", "runtimeHash"])
  .index("by_codeId", ["codeId"]);

export const zMachineAgentTurnBinding = z.object({
  account: zid("accounts").optional(),
  codeId: z.string(),
  registrationId: z.string(),
  staticVersionId: z.string(),
  runtimeVersionId: z.string(),
  threadId: z.string(),
  messageId: z.string(),
  sessionId: z.string().optional(),
});

export const machineAgentTurnBindings = defineTable(
  zodOutputToConvex(zMachineAgentTurnBinding),
)
  .index("by_messageId", ["messageId"])
  .index("by_account", ["account"])
  .index("by_threadId", ["threadId"])
  .index("by_codeId", ["codeId"]);
