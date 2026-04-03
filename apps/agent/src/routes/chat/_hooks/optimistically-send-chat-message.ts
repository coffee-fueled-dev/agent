import type { OptimisticLocalStore } from "convex/browser";
import { insertAtTop } from "convex/react";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { MessageDoc, StreamArgs } from "@convex-dev/agent/validators";
import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import type { UIMessage } from "@convex-dev/agent/react";

function randomUUID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2, 15) +
    Math.random().toString(36).slice(2, 15)
  );
}

/**
 * Like `@convex-dev/agent/react` `optimisticallySendMessage`, but supports
 * optional `memoryRecordIds` for a best-effort pending row until the server responds.
 */
export function optimisticallySendChatMessage(
  query: FunctionReference<
    "query",
    "public",
    {
      threadId: string;
      paginationOpts: PaginationOptions;
      streamArgs?: StreamArgs;
    },
    PaginationResult<MessageDoc | UIMessage> & {
      streams?: SyncStreamsReturnValue;
    }
  >,
): (
  store: OptimisticLocalStore,
  args: {
    threadId: string;
    prompt: string;
    memoryRecordIds?: string[];
  },
) => void {
  return (store, args) => {
    const queries = store.getAllQueries(query);
    let maxOrder = -1;
    for (const q of queries) {
      if (q.args?.threadId !== args.threadId) continue;
      if (q.args.streamArgs) continue;
      for (const m of q.value?.page ?? []) {
        maxOrder = Math.max(maxOrder, m.order);
      }
    }
    const order = maxOrder + 1;
    const stepOrder = 0;
    const id = randomUUID();
    const { prompt, memoryRecordIds, ...rest } = args;

    const parts: Array<{ type: "text"; text: string }> = [];
    if (prompt.trim()) {
      parts.push({ type: "text", text: prompt.trim() });
    }
    if (memoryRecordIds?.length) {
      parts.push({
        type: "text",
        text: `[${memoryRecordIds.length} memory context]`,
      });
    }

    const displayText =
      [prompt.trim(), memoryRecordIds?.length ? `[${memoryRecordIds.length} memories]` : ""]
        .filter(Boolean)
        .join("\n\n") || " ";

    insertAtTop({
      paginatedQuery: query,
      argsToMatch: { threadId: args.threadId, streamArgs: undefined },
      item: {
        ...rest,
        _creationTime: Date.now(),
        _id: id,
        id,
        key: `${args.threadId}-${order}-${stepOrder}`,
        order,
        stepOrder,
        status: "pending",
        tool: false,
        message: {
          role: "user",
          content: parts.length ? parts : displayText,
        },
        parts: parts.length ? parts : [{ type: "text", text: displayText }],
        role: "user",
        text: displayText,
      },
      localQueryStore: store,
    });
  };
}
