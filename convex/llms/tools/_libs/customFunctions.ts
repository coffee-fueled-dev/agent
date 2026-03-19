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
import type { SessionActionCtx } from "../../../customFunctions";

export type ToolBuilderContext = Omit<SessionActionCtx, "sessionId"> & {
  threadId: string;
  messageId: string;
  sessionId: SessionId;
};

export type ToolExecutionContext = ToolCtx & {
  threadId: string;
  messageId: string;
  sessionId: SessionId;
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

export type ToolkitContext = {
  runPolicyQuery: (
    query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
  ) => Promise<boolean>;
  runDependencyQuery: <T>(
    query: FunctionReference<"query", "internal", ToolPolicyArgs, T>,
  ) => Promise<T>;
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
  return {
    runPolicyQuery: (query) => ctx.runSessionQuery(query, args),
    runDependencyQuery: (query) => ctx.runSessionQuery(query, args),
  };
}
