import { listMessages } from "@convex-dev/agent";
import type { ToolSpec } from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { toJSONSchema } from "zod/v4";
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

const toolSpecValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  enabled: v.boolean(),
  policyIds: v.optional(v.array(v.string())),
  inputJsonSchema: v.optional(v.any()),
});

/** Convex values cannot include object keys starting with {@code $} (e.g. JSON Schema {@code $schema}, {@code $ref}). */
function sanitizeJsonSchemaForConvex(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonSchemaForConvex);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.startsWith("$")) {
      continue;
    }
    out[k] = sanitizeJsonSchemaForConvex(v);
  }
  return out;
}

function serializeInputSchema(spec: ToolSpec): unknown {
  const schema = spec.inputSchema as unknown as {
    toJSONSchema?: (params?: object) => unknown;
  };
  let raw: unknown;
  if (typeof schema?.toJSONSchema === "function") {
    raw = schema.toJSONSchema();
  } else {
    try {
      raw = toJSONSchema(schema as never);
    } catch {
      return undefined;
    }
  }
  return sanitizeJsonSchemaForConvex(raw);
}

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
    let messageId = args.messageId;
    if (threadId) {
      if (!messageId?.length) {
        const row = await ctx.db
          .query("chatContext")
          .withIndex("by_namespace_thread", (q) =>
            q.eq("namespace", args.namespace).eq("threadId", threadId),
          )
          .first();
        messageId = row?.lastMessageId;
      }
      /** Opening threads with history may have no `chatContext` row until send/stream; use thread tip. */
      if (!messageId?.length) {
        const tipPage = await listMessages(ctx, components.agent, {
          threadId,
          paginationOpts: { cursor: null, numItems: 1 },
        });
        messageId = tipPage.page[0]?._id;
      }
    }
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
    const toolCtx = adaptToHumanToolBuilderContext(ctx, {
      threadId: args.threadId,
      ...(args.messageId !== undefined ? { messageId: args.messageId } : {}),
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

    let anchorMessageId = args.messageId;
    if (!anchorMessageId?.length) {
      const tipPage = await listMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: { cursor: null, numItems: 1 },
      });
      anchorMessageId = tipPage.page[0]?._id;
    }

    const streamId = chatActorStreamId(args.threadId, args.namespace);
    const invocationEntryId = crypto.randomUUID();
    const basePayload = {
      threadId: args.threadId,
      actorKey: args.namespace,
      toolName: args.toolName,
      ...(anchorMessageId ? { anchorMessageId } : {}),
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
