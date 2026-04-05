import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import type { UIMessage } from "../../agents/_tools/uiMessage.js";
import type { ThreadMessageMetadata } from "./threadUiMessages.js";

export const streamArgsValidator = v.union(
  v.object({
    kind: v.literal("list"),
    startOrder: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("deltas"),
    cursors: v.array(
      v.object({
        streamId: v.string(),
        cursor: v.number(),
      }),
    ),
  }),
);

export type ListThreadMessagesPage = PaginationResult<
  UIMessage<ThreadMessageMetadata>
> & {
  streams: SyncStreamsReturnValue;
};
