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
    staticSnapshot: v.optional(v.any()),
    runtimeSnapshot: v.optional(v.any()),
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.optional(v.string()),
    tools: v.optional(
      v.array(
        v.object({
          toolKey: v.string(),
          toolHash: v.string(),
          staticSnapshot: v.optional(v.any()),
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
      staticSnapshot: args.staticSnapshot,
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
      runtimeSnapshot: args.runtimeSnapshot,
      now,
    });

    const toolResults: Array<{
      toolKey: string;
      toolHash: string;
      registrationId: Id<"toolRegistrations">;
      toolVersionId: Id<"toolVersions">;
      created: { toolRegistration: boolean; toolVersion: boolean };
    }> = [];

    if (args.tools) {
      for (const t of args.tools) {
        if (t.staticSnapshot === undefined) {
          const reg = await ctx.db
            .query("toolRegistrations")
            .withIndex("by_toolKey", (q) => q.eq("toolKey", t.toolKey))
            .first();
          if (!reg) {
            throw new Error(
              `recordTurnIdentity: missing staticSnapshot for new tool "${t.toolKey}"`,
            );
          }
          const ver = await ctx.db
            .query("toolVersions")
            .withIndex("by_registration_and_toolHash", (q) =>
              q.eq("registrationId", reg._id).eq("toolHash", t.toolHash),
            )
            .first();
          if (!ver) {
            throw new Error(
              `recordTurnIdentity: unknown tool version ${t.toolKey}@${t.toolHash}`,
            );
          }
          toolResults.push({
            toolKey: t.toolKey,
            toolHash: t.toolHash,
            registrationId: reg._id,
            toolVersionId: ver._id,
            created: { toolRegistration: false, toolVersion: false },
          });
        } else {
          const ensured = await ensureToolRegistration(ctx, {
            toolKey: t.toolKey,
            toolHash: t.toolHash,
            staticSnapshot: t.staticSnapshot,
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
      }
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
      staticSnapshot: args.staticSnapshot,
      runtimeSnapshot: args.runtimeSnapshot,
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
