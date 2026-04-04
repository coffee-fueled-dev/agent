/**
 * Chat-layer integration for the human toolkit: thread message anchors, per-actor history, and
 * Convex queries/actions at {@code api.chat.humanAgent.*}. Helpers and submodules live under
 * {@code chat/humanAgent/}; toolkit definitions stay in {@code agents/human/}.
 */
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { components } from "../_generated/api.js";
import { action, query } from "../_generated/server.js";
import { humanTools } from "../agents/human/humanToolkit.js";
import type {
  HumanToolkitToolName,
  HumanToolkitToolUi,
} from "../agents/human/humanToolkitTypes.js";
import {
  adaptToHumanToolBuilderContext,
  createConvexAgentEnv,
  createHumanToolkitContextFromQuery,
  createToolkitContext,
} from "../agents/lib/customFunctions.js";
import {
  CHAT_ACTOR_STREAM_TYPE,
  type ChatActorTurnPayload,
  chatActorHistory,
  chatActorStreamId,
} from "./actorHistory.js";
import { serializeInputSchema } from "./humanAgent/toolSpecJsonSchema.js";
import {
  resolveEffectiveThreadMessageIdForAction,
  resolveEffectiveThreadMessageIdForQuery,
} from "./thread/threadMessageAnchor.js";

const toolSpecValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  enabled: v.boolean(),
  policyIds: v.optional(v.array(v.string())),
  inputJsonSchema: v.optional(v.any()),
});

/**
 * Server-driven human affordances: tools enabled after policy evaluation, with JSON Schema for inputs.
 * Omit {@code threadId} before a thread exists (e.g. new chat); policy runs with namespace + session only.
 * With a thread, {@code messageId} overrides; else {@code chatContext.lastMessageId} / thread tip are used.
 */
export const humanToolkitForChat = query({
  args: {
    threadId: v.optional(v.string()),
    namespace: v.string(),
    ...SessionIdArg,
    /** Thread tip message id; omit to use {@code chatContext.lastMessageId} or list tip when thread is set. */
    messageId: v.optional(v.string()),
  },
  returns: v.object({
    tools: v.array(toolSpecValidator),
    instructions: v.string(),
  }),
  handler: async (ctx, args) => {
    const threadId = args.threadId?.trim() || undefined;
    const messageId =
      threadId !== undefined
        ? await resolveEffectiveThreadMessageIdForQuery(ctx, {
            namespace: args.namespace,
            threadId,
            messageIdOverride: args.messageId,
          })
        : undefined;
    const toolkitCtx = createHumanToolkitContextFromQuery(ctx, {
      ...(threadId ? { threadId } : {}),
      ...(messageId?.length ? { messageId } : {}),
      sessionId: args.sessionId,
      namespace: args.namespace,
    });
    const { tools, instructions } = await humanTools.evaluate(toolkitCtx);
    const list: HumanToolkitToolUi[] = Object.entries(tools).map(
      ([name, spec]) => ({
        name: name as HumanToolkitToolName,
        description: spec.description,
        enabled: true,
        policyIds: spec.policyIds,
        inputJsonSchema: serializeInputSchema(spec),
      }),
    );
    return { tools: list, instructions };
  },
});

export const executeHumanTool = action({
  args: {
    threadId: v.string(),
    userId: v.string(),
    namespace: v.string(),
    ...SessionIdArg,
    messageId: v.optional(v.string()),
    toolName: v.string(),
    input: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId as never,
    });
    if (!thread || thread.userId !== args.userId) {
      throw new Error("Thread not found or access denied");
    }
    if (args.namespace !== args.userId) {
      throw new Error("Namespace must match authenticated user");
    }
    const effectiveMessageId = await resolveEffectiveThreadMessageIdForAction(
      ctx,
      {
        namespace: args.namespace,
        threadId: args.threadId,
        messageIdOverride: args.messageId,
      },
    );
    const toolCtx = adaptToHumanToolBuilderContext(ctx, {
      threadId: args.threadId,
      ...(effectiveMessageId !== undefined
        ? { messageId: effectiveMessageId }
        : {}),
      sessionId: args.sessionId,
      namespace: args.namespace,
    });
    const tk = createToolkitContext(toolCtx);
    const { tools } = await humanTools.evaluate(tk);
    const spec = tools[args.toolName];
    if (!spec) {
      throw new Error(
        `Tool not available or denied by policy: ${args.toolName}`,
      );
    }
    const validateResult = await spec.inputSchema["~standard"].validate(
      args.input,
    );
    if (!("value" in validateResult)) {
      const issues = validateResult.issues?.map((i) => i.message).join("; ");
      throw new Error(issues ?? "Invalid tool input");
    }

    const streamId = chatActorStreamId(args.threadId, args.namespace);
    const invocationEntryId = crypto.randomUUID();
    const basePayload = {
      threadId: args.threadId,
      actorKey: args.namespace,
      toolName: args.toolName,
      ...(effectiveMessageId ? { anchorMessageId: effectiveMessageId } : {}),
    } satisfies ChatActorTurnPayload;

    await chatActorHistory.append(ctx, {
      streamType: CHAT_ACTOR_STREAM_TYPE,
      streamId,
      entryId: invocationEntryId,
      kind: "humanToolInvocation",
      payload: basePayload,
    });

    const env = createConvexAgentEnv(toolCtx);
    try {
      return await spec.handler(
        {
          env,
          namespace: args.namespace,
          agentId: args.namespace,
          agentName: "User",
        },
        validateResult.value,
      );
    } finally {
      await chatActorHistory.append(ctx, {
        streamType: CHAT_ACTOR_STREAM_TYPE,
        streamId,
        entryId: crypto.randomUUID(),
        kind: "humanToolCompletion",
        parentEntryIds: [invocationEntryId],
        payload: basePayload,
      });
    }
  },
});
