import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import {
  ensureAgentRegistration,
  ensureRuntimeVersion,
  ensureToolRegistration,
} from "../internal/helpers";

export const recordTurnIdentity = mutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    staticHash: v.string(),
    runtimeHash: v.string(),
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.optional(v.string()),
    tools: v.optional(
      v.array(
        v.object({
          toolKey: v.string(),
          toolHash: v.string(),
        }),
      ),
    ),
  },
  returns: v.object({
    registrationId: v.id("agentRegistrations"),
    staticVersionId: v.id("agentStaticVersions"),
    runtimeVersionId: v.id("agentRuntimeVersions"),
    bindingId: v.id("turnIdentityBindings"),
    created: v.object({
      registration: v.boolean(),
      staticVersion: v.boolean(),
      runtimeVersion: v.boolean(),
      binding: v.boolean(),
    }),
    toolResults: v.array(
      v.object({
        toolKey: v.string(),
        toolHash: v.string(),
        registrationId: v.id("toolRegistrations"),
        toolVersionId: v.id("toolVersions"),
        created: v.object({
          toolRegistration: v.boolean(),
          toolVersion: v.boolean(),
        }),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingBinding = await ctx.db
      .query("turnIdentityBindings")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (existingBinding) {
      return {
        registrationId: existingBinding.registrationId,
        staticVersionId: existingBinding.staticVersionId,
        runtimeVersionId: existingBinding.runtimeVersionId,
        bindingId: existingBinding._id,
        created: {
          registration: false,
          staticVersion: false,
          runtimeVersion: false,
          binding: false,
        },
        toolResults: [],
      };
    }

    const agent = await ensureAgentRegistration(ctx, {
      agentId: args.agentId,
      name: args.agentName,
      staticHash: args.staticHash,
      now,
      metadata: undefined,
    });

    await ctx.db.patch(agent.registrationId, {
      latestRuntimeHash: args.runtimeHash,
      updatedAt: now,
    });

    const runtime = await ensureRuntimeVersion(ctx, {
      staticVersionId: agent.staticVersionId,
      runtimeHash: args.runtimeHash,
      now,
    });

    const toolResults: Array<{
      toolKey: string;
      toolHash: string;
      registrationId: Id<"toolRegistrations">;
      toolVersionId: Id<"toolVersions">;
      created: { toolRegistration: boolean; toolVersion: boolean };
    }> = [];

    for (const t of args.tools ?? []) {
      const ensured = await ensureToolRegistration(ctx, {
        toolKey: t.toolKey,
        toolHash: t.toolHash,
        now,
        metadata: undefined,
      });
      toolResults.push({
        toolKey: t.toolKey,
        toolHash: t.toolHash,
        registrationId: ensured.registrationId,
        toolVersionId: ensured.toolVersionId,
        created: ensured.created,
      });
    }

    const bindingId = await ctx.db.insert("turnIdentityBindings", {
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      agentName: args.agentName,
      registrationId: agent.registrationId,
      staticVersionId: agent.staticVersionId,
      runtimeVersionId: runtime.runtimeVersionId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      toolRefs:
        toolResults.length > 0
          ? toolResults.map((r) => ({
              toolKey: r.toolKey,
              toolHash: r.toolHash,
              toolVersionId: r.toolVersionId,
            }))
          : undefined,
      createdAt: now,
    });

    return {
      registrationId: agent.registrationId,
      staticVersionId: agent.staticVersionId,
      runtimeVersionId: runtime.runtimeVersionId,
      bindingId,
      created: {
        registration: agent.created.registration,
        staticVersion: agent.created.staticVersion,
        runtimeVersion: runtime.created,
        binding: true,
      },
      toolResults,
    };
  },
});
