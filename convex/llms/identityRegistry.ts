import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const recordTurnIdentity = internalMutation({
  args: {
    codeId: v.string(),
    name: v.string(),
    staticHash: v.string(),
    staticSnapshot: v.any(),
    runtimeHash: v.string(),
    runtimeSnapshot: v.any(),
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.optional(v.string()),
  },
  returns: v.object({
    registrationId: v.string(),
    staticVersionId: v.string(),
    runtimeVersionId: v.string(),
    created: v.object({
      registration: v.boolean(),
      staticVersion: v.boolean(),
      runtimeVersion: v.boolean(),
      binding: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    let registration = await ctx.db
      .query("machineAgentRegistrations")
      .withIndex("by_codeId", (q) => q.eq("codeId", args.codeId))
      .unique();
    let registrationCreated = false;
    if (!registration) {
      const registrationId = await ctx.db.insert("machineAgentRegistrations", {
        codeId: args.codeId,
        name: args.name,
        createdAt: now,
        lastSeenAt: now,
        latestStaticHash: args.staticHash,
        latestRuntimeHash: args.runtimeHash,
      });
      registration = await ctx.db.get(registrationId);
      registrationCreated = true;
    }
    if (!registration) {
      throw new Error("Failed to create machine agent registration");
    }
    if (!registrationCreated) {
      await ctx.db.patch(registration._id, {
        name: args.name,
        lastSeenAt: now,
        latestStaticHash: args.staticHash,
        latestRuntimeHash: args.runtimeHash,
      });
    }

    let staticVersion = await ctx.db
      .query("machineAgentStaticVersions")
      .withIndex("by_registrationId_staticHash", (q) =>
        q.eq("registrationId", registration._id).eq("staticHash", args.staticHash),
      )
      .unique();
    let staticVersionCreated = false;
    if (!staticVersion) {
      const staticVersionId = await ctx.db.insert("machineAgentStaticVersions", {
        registrationId: registration._id,
        codeId: args.codeId,
        staticHash: args.staticHash,
        snapshot: args.staticSnapshot,
        createdAt: now,
        lastSeenAt: now,
      });
      staticVersion = await ctx.db.get(staticVersionId);
      staticVersionCreated = true;
    }
    if (!staticVersion) {
      throw new Error("Failed to create machine agent static version");
    }
    if (!staticVersionCreated) {
      await ctx.db.patch(staticVersion._id, {
        lastSeenAt: now,
      });
    }

    let runtimeVersion = await ctx.db
      .query("machineAgentRuntimeVersions")
      .withIndex("by_staticVersionId_runtimeHash", (q) =>
        q
          .eq("staticVersionId", staticVersion._id)
          .eq("runtimeHash", args.runtimeHash),
      )
      .unique();
    let runtimeVersionCreated = false;
    if (!runtimeVersion) {
      const runtimeVersionId = await ctx.db.insert("machineAgentRuntimeVersions", {
        registrationId: registration._id,
        staticVersionId: staticVersion._id,
        codeId: args.codeId,
        runtimeHash: args.runtimeHash,
        snapshot: args.runtimeSnapshot,
        createdAt: now,
        lastSeenAt: now,
      });
      runtimeVersion = await ctx.db.get(runtimeVersionId);
      runtimeVersionCreated = true;
    }
    if (!runtimeVersion) {
      throw new Error("Failed to create machine agent runtime version");
    }
    if (!runtimeVersionCreated) {
      await ctx.db.patch(runtimeVersion._id, {
        lastSeenAt: now,
      });
    }

    const binding = await ctx.db
      .query("machineAgentTurnBindings")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .unique();

    let bindingCreated = false;
    if (!binding) {
      await ctx.db.insert("machineAgentTurnBindings", {
        codeId: args.codeId,
        registrationId: registration._id,
        staticVersionId: staticVersion._id,
        runtimeVersionId: runtimeVersion._id,
        threadId: args.threadId,
        messageId: args.messageId,
        sessionId: args.sessionId,
        recordedAt: now,
      });
      bindingCreated = true;
    } else {
      await ctx.db.patch(binding._id, {
        codeId: args.codeId,
        registrationId: registration._id,
        staticVersionId: staticVersion._id,
        runtimeVersionId: runtimeVersion._id,
        threadId: args.threadId,
        sessionId: args.sessionId,
        recordedAt: now,
      });
    }

    return {
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      created: {
        registration: registrationCreated,
        staticVersion: staticVersionCreated,
        runtimeVersion: runtimeVersionCreated,
        binding: bindingCreated,
      },
    };
  },
});
