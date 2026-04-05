import { v } from "convex/values";
import { internalMutation } from "../_generated/server.js";
import { events, MEMORY_OBSERVABILITY_STREAM_ID } from "./events.js";

const threadScoped = {
  userId: v.string(),
  threadId: v.string(),
};

export const appendToolExecuted = internalMutation({
  args: {
    ...threadScoped,
    messageId: v.string(),
    sessionId: v.string(),
    namespace: v.string(),
    agentId: v.optional(v.string()),
    ok: v.boolean(),
    toolName: v.string(),
    input: v.any(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, threadId, ...rest } = args;
    await events.appendToStream(ctx, {
      name: "toolPipeline",
      namespace: userId,
      streamId: threadId,
      eventId: crypto.randomUUID(),
      eventType: "toolExecuted",
      payload: {
        threadId,
        messageId: rest.messageId,
        sessionId: rest.sessionId,
        namespace: rest.namespace,
        agentId: rest.agentId,
        ok: rest.ok,
        toolName: rest.toolName,
        input: rest.input,
        output: rest.output,
        error: rest.error,
        durationMs: rest.durationMs,
      },
    });
    return null;
  },
});

export const appendPolicyEvaluated = internalMutation({
  args: {
    ...threadScoped,
    messageId: v.string(),
    sessionId: v.string(),
    namespace: v.string(),
    agentId: v.optional(v.string()),
    ok: v.boolean(),
    policyId: v.string(),
    phase: v.union(
      v.literal("toolkit"),
      v.literal("tool"),
      v.literal("dynamicToolkit"),
    ),
    toolName: v.optional(v.string()),
    composableName: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, threadId, ...rest } = args;
    await events.appendToStream(ctx, {
      name: "toolPipeline",
      namespace: userId,
      streamId: threadId,
      eventId: crypto.randomUUID(),
      eventType: "policyEvaluated",
      payload: {
        threadId,
        messageId: rest.messageId,
        sessionId: rest.sessionId,
        namespace: rest.namespace,
        agentId: rest.agentId,
        ok: rest.ok,
        policyId: rest.policyId,
        phase: rest.phase,
        toolName: rest.toolName,
        composableName: rest.composableName,
        error: rest.error,
      },
    });
    return null;
  },
});

export const appendFingerprint = internalMutation({
  args: {
    ...threadScoped,
    eventId: v.string(),
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await events.appendToStream(ctx, {
      name: "fingerprints",
      namespace: args.userId,
      streamId: args.threadId,
      eventId: args.eventId,
      eventType: "record",
      payload: { payload: args.payload },
    });
    return null;
  },
});

export const appendMemoryMerge = internalMutation({
  args: {
    userId: v.string(),
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await events.appendToStream(ctx, {
      name: "memory",
      namespace: args.userId,
      streamId: MEMORY_OBSERVABILITY_STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "mergeMemory",
      payload: { payload: args.payload },
    });
    return null;
  },
});

export const appendMemorySearch = internalMutation({
  args: {
    userId: v.string(),
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await events.appendToStream(ctx, {
      name: "memory",
      namespace: args.userId,
      streamId: MEMORY_OBSERVABILITY_STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "searchMemory",
      payload: { payload: args.payload },
    });
    return null;
  },
});

export const appendRegisterStorageSourceMetadata = internalMutation({
  args: {
    userId: v.string(),
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await events.appendToStream(ctx, {
      name: "memory",
      namespace: args.userId,
      streamId: MEMORY_OBSERVABILITY_STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "registerStorageSourceMetadata",
      payload: { payload: args.payload },
    });
    return null;
  },
});
