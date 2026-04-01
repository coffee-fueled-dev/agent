import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { ensureAgentRegistration, ensureToolRegistration } from "../internal/helpers";

export const registerAgent = mutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    staticHash: v.string(),
    staticSnapshot: v.optional(v.any()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.object({
    registrationId: v.id("agentRegistrations"),
    staticVersionId: v.id("agentStaticVersions"),
    created: v.object({
      registration: v.boolean(),
      staticVersion: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ensureAgentRegistration(ctx, {
      agentId: args.agentId,
      name: args.name,
      staticHash: args.staticHash,
      staticSnapshot: args.staticSnapshot,
      now,
      metadata: args.metadata,
    });
  },
});

export const registerTool = mutation({
  args: {
    toolKey: v.string(),
    toolHash: v.string(),
    staticSnapshot: v.any(),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.object({
    registrationId: v.id("toolRegistrations"),
    toolVersionId: v.id("toolVersions"),
    created: v.object({
      toolRegistration: v.boolean(),
      toolVersion: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ensureToolRegistration(ctx, {
      toolKey: args.toolKey,
      toolHash: args.toolHash,
      staticSnapshot: args.staticSnapshot,
      now,
      metadata: args.metadata,
    });
  },
});
