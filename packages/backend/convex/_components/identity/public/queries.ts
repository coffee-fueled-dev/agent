import { v } from "convex/values";
import { query } from "../_generated/server";

const registrationDoc = v.union(
  v.null(),
  v.object({
    _id: v.id("agentRegistrations"),
    agentId: v.string(),
    name: v.string(),
    latestStaticHash: v.string(),
    latestRuntimeHash: v.optional(v.string()),
    updatedAt: v.number(),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
);

const toolRegistrationDoc = v.union(
  v.null(),
  v.object({
    _id: v.id("toolRegistrations"),
    toolKey: v.string(),
    latestToolHash: v.string(),
    staticSnapshot: v.any(),
    updatedAt: v.number(),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
);

const staticVersionDoc = v.object({
  _id: v.id("agentStaticVersions"),
  registrationId: v.id("agentRegistrations"),
  staticHash: v.string(),
  staticSnapshot: v.optional(v.any()),
  createdAt: v.number(),
});

const runtimeVersionDoc = v.object({
  _id: v.id("agentRuntimeVersions"),
  staticVersionId: v.id("agentStaticVersions"),
  runtimeHash: v.string(),
  runtimeSnapshot: v.optional(v.any()),
  createdAt: v.number(),
});

const toolVersionDoc = v.object({
  _id: v.id("toolVersions"),
  registrationId: v.id("toolRegistrations"),
  toolHash: v.string(),
  staticSnapshot: v.any(),
  createdAt: v.number(),
});

const turnBindingDoc = v.union(
  v.null(),
  v.object({
    _id: v.id("turnIdentityBindings"),
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
    staticSnapshot: v.optional(v.any()),
    runtimeSnapshot: v.optional(v.any()),
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
  }),
);

export const getAgentRegistration = query({
  args: { agentId: v.string() },
  returns: registrationDoc,
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("agentRegistrations")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!row) return null;
    return {
      _id: row._id,
      agentId: row.agentId,
      name: row.name,
      latestStaticHash: row.latestStaticHash,
      latestRuntimeHash: row.latestRuntimeHash,
      updatedAt: row.updatedAt,
      metadata: row.metadata,
    };
  },
});

export const getToolRegistration = query({
  args: { toolKey: v.string() },
  returns: toolRegistrationDoc,
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("toolRegistrations")
      .withIndex("by_toolKey", (q) => q.eq("toolKey", args.toolKey))
      .first();
    if (!row) return null;
    return {
      _id: row._id,
      toolKey: row.toolKey,
      latestToolHash: row.latestToolHash,
      staticSnapshot: row.staticSnapshot,
      updatedAt: row.updatedAt,
      metadata: row.metadata,
    };
  },
});

export const getAgentVersionHistory = query({
  args: {
    agentId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    staticVersions: v.array(staticVersionDoc),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const reg = await ctx.db
      .query("agentRegistrations")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!reg) {
      return { staticVersions: [] };
    }
    const rows = await ctx.db
      .query("agentStaticVersions")
      .withIndex("by_registration_createdAt", (q) =>
        q.eq("registrationId", reg._id),
      )
      .order("desc")
      .take(limit);
    return {
      staticVersions: rows.map((r) => ({
        _id: r._id,
        registrationId: r.registrationId,
        staticHash: r.staticHash,
        staticSnapshot: r.staticSnapshot,
        createdAt: r.createdAt,
      })),
    };
  },
});

export const getToolVersionHistory = query({
  args: {
    toolKey: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    toolVersions: v.array(toolVersionDoc),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const reg = await ctx.db
      .query("toolRegistrations")
      .withIndex("by_toolKey", (q) => q.eq("toolKey", args.toolKey))
      .first();
    if (!reg) {
      return { toolVersions: [] };
    }
    const rows = await ctx.db
      .query("toolVersions")
      .withIndex("by_registration_createdAt", (q) =>
        q.eq("registrationId", reg._id),
      )
      .order("desc")
      .take(limit);
    return {
      toolVersions: rows.map((r) => ({
        _id: r._id,
        registrationId: r.registrationId,
        toolHash: r.toolHash,
        staticSnapshot: r.staticSnapshot,
        createdAt: r.createdAt,
      })),
    };
  },
});

export const getRuntimeVersionsForStaticVersion = query({
  args: {
    staticVersionId: v.id("agentStaticVersions"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    runtimeVersions: v.array(runtimeVersionDoc),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const rows = await ctx.db
      .query("agentRuntimeVersions")
      .withIndex("by_static_createdAt", (q) =>
        q.eq("staticVersionId", args.staticVersionId),
      )
      .order("desc")
      .take(limit);
    return {
      runtimeVersions: rows.map((r) => ({
        _id: r._id,
        staticVersionId: r.staticVersionId,
        runtimeHash: r.runtimeHash,
        runtimeSnapshot: r.runtimeSnapshot,
        createdAt: r.createdAt,
      })),
    };
  },
});

export const getTurnBinding = query({
  args: { messageId: v.string() },
  returns: turnBindingDoc,
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("turnIdentityBindings")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
    if (!row) return null;
    return {
      _id: row._id,
      threadId: row.threadId,
      messageId: row.messageId,
      sessionId: row.sessionId,
      agentId: row.agentId,
      agentName: row.agentName,
      registrationId: row.registrationId,
      staticVersionId: row.staticVersionId,
      runtimeVersionId: row.runtimeVersionId,
      staticHash: row.staticHash,
      runtimeHash: row.runtimeHash,
      staticSnapshot: row.staticSnapshot,
      runtimeSnapshot: row.runtimeSnapshot,
      toolRefs: row.toolRefs,
      createdAt: row.createdAt,
    };
  },
});

export const listTurnBindingsForThread = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    bindings: v.array(
      v.object({
        _id: v.id("turnIdentityBindings"),
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
        staticSnapshot: v.optional(v.any()),
        runtimeSnapshot: v.optional(v.any()),
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
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const rows = await ctx.db
      .query("turnIdentityBindings")
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(limit);
    return {
      bindings: rows.map((row) => ({
        _id: row._id,
        threadId: row.threadId,
        messageId: row.messageId,
        sessionId: row.sessionId,
        agentId: row.agentId,
        agentName: row.agentName,
        registrationId: row.registrationId,
        staticVersionId: row.staticVersionId,
        runtimeVersionId: row.runtimeVersionId,
        staticHash: row.staticHash,
        runtimeHash: row.runtimeHash,
        staticSnapshot: row.staticSnapshot,
        runtimeSnapshot: row.runtimeSnapshot,
        toolRefs: row.toolRefs,
        createdAt: row.createdAt,
      })),
    };
  },
});
