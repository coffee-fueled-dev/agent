import { v } from "convex/values";
import { internal } from "../_generated/api";
import { type ActionCtx, internalMutation } from "../_generated/server";
import { events } from "../events";

export const toolTelemetryEventTypes = [
  "policy_eval_started",
  "policy_eval_result",
  "tool_started",
  "tool_succeeded",
  "tool_failed",
] as const;

/**
 * Appends threadIdentity telemetry (policy + tool lifecycle). Invoked via
 * `ctx.scheduler.runAfter(0, …)` from action handlers so tool execution stays fast.
 */
export const appendThreadToolTelemetry = internalMutation({
  args: {
    namespace: v.string(),
    streamId: v.string(),
    eventId: v.string(),
    eventType: v.union(
      v.literal("policy_eval_started"),
      v.literal("policy_eval_result"),
      v.literal("tool_started"),
      v.literal("tool_succeeded"),
      v.literal("tool_failed"),
    ),
    payload: v.any(),
    metadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null()),
      ),
    ),
    session: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      namespace: args.namespace,
      streamId: args.streamId,
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload,
      metadata: {
        ...(args.metadata ?? {}),
        threadId: args.streamId,
      },
      ...(args.session ? { session: args.session } : {}),
    });
    return null;
  },
});

export type ToolTelemetryEventType = (typeof toolTelemetryEventTypes)[number];

export function scheduleThreadToolTelemetry(
  ctx: Pick<ActionCtx, "scheduler">,
  args: {
    namespace: string;
    streamId: string;
    eventId: string;
    eventType: ToolTelemetryEventType;
    payload: Record<string, unknown>;
    metadata?: Record<string, string | number | boolean | null>;
    session?: string;
  },
): void {
  ctx.scheduler.runAfter(
    0,
    internal.chat.toolTelemetry.appendThreadToolTelemetry,
    args,
  );
}
