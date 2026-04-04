import { listMessages } from "@convex-dev/agent";
import type { ToolSpec } from "@very-coffee/agent-identity";
import type { JSONValue, ModelMessage, ToolCallPart, ToolResultPart } from "ai";
import { api, components } from "../_generated/api.js";
import type { ActionCtx } from "../_generated/server.js";
import { humanTools } from "../agents/human/humanToolkit.js";
import {
  adaptToHumanToolBuilderContext,
  createConvexAgentEnv,
  createHumanToolkitContextFromQuery,
} from "../agents/lib/customFunctions.js";
import type { HumanToolCall } from "./humanToolCallValidator.js";

async function threadTipMessageId(
  ctx: Pick<ActionCtx, "runQuery">,
  threadId: string,
  namespace: string,
): Promise<string | undefined> {
  const row = await ctx.runQuery(api.chat.chatContext.getChatContext, {
    namespace,
    threadId,
  });
  let messageId = row?.lastMessageId;
  if (!messageId?.length) {
    const tipPage = await listMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { cursor: null, numItems: 1 },
    });
    messageId = tipPage.page[0]?._id;
  }
  return messageId?.length ? messageId : undefined;
}

function toolOutputToJsonValue(output: unknown): JSONValue {
  return JSON.parse(JSON.stringify(output)) as JSONValue;
}

/**
 * Policy evaluation + {@link humanTools.evaluate}, then runs each tool call **concurrently** via
 * its registered {@link ToolSpec.handler}.
 *
 * Returns two messages so the UI stream is valid: an assistant row with **only** `tool-call`
 * parts, then a `role: "tool"` row with the matching `tool-result` parts (same `toolCallId`s).
 *
 * Expects {@link ActionCtx} so tool handlers can use real {@code runAction} (e.g. shareMemories).
 */
export async function executeHumanToolCallsForTurn(
  ctx: ActionCtx,
  args: {
    threadId: string;
    namespace: string;
    sessionId: string;
    toolCalls: HumanToolCall[];
  },
): Promise<[ModelMessage, ModelMessage]> {
  const messageId = await threadTipMessageId(
    ctx,
    args.threadId,
    args.namespace,
  );
  const toolkitCtx = createHumanToolkitContextFromQuery(ctx, {
    threadId: args.threadId,
    ...(messageId !== undefined ? { messageId } : {}),
    sessionId: args.sessionId,
    namespace: args.namespace,
  });
  const { tools } = await humanTools.evaluate(toolkitCtx);

  const toolBuilderCtx = adaptToHumanToolBuilderContext(ctx, {
    threadId: args.threadId,
    ...(messageId !== undefined ? { messageId } : {}),
    sessionId: args.sessionId,
    namespace: args.namespace,
  });
  const env = createConvexAgentEnv(toolBuilderCtx);
  const runtimeBase = {
    env,
    namespace: args.namespace,
    agentId: args.namespace,
    agentName: "User" as const,
  };

  const pairs = await Promise.all(
    args.toolCalls.map(async (call) => {
      const spec = tools[call.name] as ToolSpec | undefined;
      if (!spec) {
        throw new Error(`Tool not available or denied by policy: ${call.name}`);
      }
      const validateResult = await spec.inputSchema["~standard"].validate(
        call.input,
      );
      if (!("value" in validateResult)) {
        const issues = validateResult.issues?.map((i) => i.message).join("; ");
        throw new Error(issues ?? "Invalid tool input");
      }
      const value = validateResult.value;
      const toolCallId = crypto.randomUUID();
      const output = await spec.handler(runtimeBase, value);
      return {
        toolCallId,
        toolName: spec.name,
        input: value,
        output,
      };
    }),
  );

  const toolCallsContent: ToolCallPart[] = pairs.map((p) => ({
    type: "tool-call",
    toolCallId: p.toolCallId,
    toolName: p.toolName,
    input: p.input,
  }));
  const toolResultsContent: ToolResultPart[] = pairs.map((p) => ({
    type: "tool-result",
    toolCallId: p.toolCallId,
    toolName: p.toolName,
    output: {
      type: "json",
      value: toolOutputToJsonValue(p.output),
    },
  }));

  return [
    { role: "assistant", content: toolCallsContent },
    { role: "tool", content: toolResultsContent },
  ];
}
