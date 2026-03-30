import type { ToolCtx } from "@convex-dev/agent";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import {
  customAction,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { type SessionId, vSessionId } from "convex-helpers/server/sessions";
import {
  internalAction as rawInternalAction,
  internalQuery as rawInternalQuery,
} from "../../../_generated/server";
import type { ToolTelemetryEventType } from "../../../chat/toolTelemetry";
import { scheduleThreadToolTelemetry } from "../../../chat/toolTelemetry";
import type { SessionActionCtx } from "../../../customFunctions";

/** Session + thread context every agent receives before agent-specific identity is layered on. */
export type AgentIdentityCtx = Omit<
  ToolBuilderContext,
  "agentId" | "agentName"
>;

export type ToolBuilderContext = Omit<SessionActionCtx, "sessionId"> & {
  threadId: string;
  messageId: string;
  sessionId: SessionId;
  /** Thread RAG / telemetry namespace; injected into toolkit + tool execution context. */
  namespace: string;
  /** Machine agent identity; included in tool / policy telemetry. */
  agentId: string;
  agentName: string;
};

export type ToolExecutionContext = ToolCtx & {
  threadId: string;
  messageId: string;
  sessionId: SessionId;
  /** Set by `dynamicTool.evaluate` from `ToolkitContext.namespace` (or override). */
  namespace: string;
  /** Machine agent identity for session resolution / telemetry (from `ToolkitContext`). */
  agentId: string;
  agentName: string;
};

export type ToolPolicyArgs = {
  threadId: string;
  messageId: string;
  sessionId: SessionId;
};

const toolContextArgs = {
  threadId: v.string(),
  messageId: v.string(),
  sessionId: vSessionId,
};

export const toolPolicyQuery = customQuery(rawInternalQuery, {
  args: toolContextArgs,
  input: (ctx, { threadId, messageId, sessionId }) => ({
    ctx: { ...ctx, threadId, messageId, sessionId },
    args: {},
  }),
});

export const toolDependencyQuery = customQuery(rawInternalQuery, {
  args: toolContextArgs,
  input: (ctx, { threadId, messageId, sessionId }) => ({
    ctx: { ...ctx, threadId, messageId, sessionId },
    args: {},
  }),
});

export const toolBuilderAction = customAction(rawInternalAction, {
  args: toolContextArgs,
  input: (ctx, { threadId, messageId, sessionId }) => ({
    ctx: {
      ...ctx,
      threadId,
      messageId,
      sessionId,
    },
    args: {},
  }),
});

/** Args for scheduled threadIdentity telemetry (policy + toolkit evaluate). */
export type ThreadToolTelemetryScheduleArgs = {
  eventType: ToolTelemetryEventType;
  eventId: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ToolkitContext = {
  runPolicyQuery: (
    query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
  ) => Promise<boolean>;
  runDependencyQuery: <T>(
    query: FunctionReference<"query", "internal", ToolPolicyArgs, T>,
  ) => Promise<T>;
  /** Thread RAG / tool telemetry namespace (from `ToolBuilderContext`). */
  namespace: string;
  /** Machine agent identity; set via `createToolkitContext` / `ToolBuilderContext`. */
  agentId: string;
  agentName: string;
  /** Present when session-scoped toolkit evaluation schedules policy/tool lifecycle events. */
  scheduleTelemetry?: (event: ThreadToolTelemetryScheduleArgs) => void;
  /** Message/thread ids for stable telemetry event keys when `scheduleTelemetry` is set. */
  toolContext?: { messageId: string; threadId: string };
};

function getToolContextArgs(ctx: ToolBuilderContext): ToolPolicyArgs {
  return {
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  };
}

export function createToolkitContext(ctx: ToolBuilderContext): ToolkitContext {
  const args = getToolContextArgs(ctx);
  const scheduleTelemetry =
    ctx.sessionId != null
      ? (event: ThreadToolTelemetryScheduleArgs) => {
          scheduleThreadToolTelemetry(ctx, {
            namespace: ctx.namespace,
            streamId: ctx.threadId,
            eventId: event.eventId,
            eventType: event.eventType,
            payload: {
              messageId: ctx.messageId,
              agentId: ctx.agentId,
              agentName: ctx.agentName,
              ...event.payload,
            },
            metadata: {
              ...event.metadata,
              messageId: ctx.messageId,
              sessionId: ctx.sessionId,
              agentId: ctx.agentId,
            },
            session: ctx.sessionId,
          });
        }
      : undefined;

  return {
    runPolicyQuery: (query) => ctx.runSessionQuery(query, args),
    runDependencyQuery: (query) => ctx.runSessionQuery(query, args),
    namespace: ctx.namespace,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
    scheduleTelemetry,
    toolContext:
      scheduleTelemetry != null
        ? { messageId: ctx.messageId, threadId: ctx.threadId }
        : undefined,
  };
}
