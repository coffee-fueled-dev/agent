/**
 * Per-actor append-only DAGs for chat turns (`streamId` = `${threadId}::${actorKey}`).
 *
 * **Merged timeline** (see {@link mergedChatActorTurnTimeline}): ordering is a **joint linear
 * extension** of the per-actor partial orders, using the @convex-dev/agent message timeline as the
 * external total order (`order` / `stepOrder` on messages referenced by `anchorMessageId`), with
 * optional `threadSeq` + `entryTime` when no message anchor exists. This is **not** a single merged
 * DAG stored in history—only a sorted view computed at read time.
 */
import type { MessageDoc } from "@convex-dev/agent/validators";
import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { HistoryClient } from "@very-coffee/convex-history";
import { components } from "../_generated/api.js";
import { query } from "../_generated/server.js";

export const CHAT_ACTOR_STREAM_TYPE = "chatActorTurn" as const;

export const ASSISTANT_ACTOR_KEY = "assistant";

export const chatActorHistory = new HistoryClient(components.history, {
  streams: [
    {
      streamType: CHAT_ACTOR_STREAM_TYPE,
      kinds: [
        "humanMessageSent",
        "assistantResponseComplete",
        "humanToolInvocation",
        "humanToolCompletion",
      ],
    },
  ],
});

export function chatActorStreamId(threadId: string, actorKey: string): string {
  return `${threadId}::${actorKey}`;
}

export type ChatActorTurnPayload = {
  threadId: string;
  actorKey: string;
  /** Agent message id this event aligns with in the transcript (preferred for merge order). */
  anchorMessageId?: string;
  /** When no message exists yet; monotonic tie-break with {@link ChatActorTurnPayload.entryTime}. */
  threadSeq?: number;
  /** Tool name / ids for human-tool rows */
  toolName?: string;
  toolCallId?: string;
};

type ListCtx = Parameters<typeof chatActorHistory.listEntries>[0];

async function collectStreamEntries(ctx: ListCtx, streamId: string) {
  const out: Awaited<
    ReturnType<typeof chatActorHistory.listEntries>
  >["page"] = [];
  let cursor: string | null = null;
  for (;;) {
    const page = await chatActorHistory.listEntries(ctx, {
      streamType: CHAT_ACTOR_STREAM_TYPE,
      streamId,
      paginationOpts: { cursor, numItems: 200 },
    });
    out.push(...page.page);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  return out;
}

async function collectAllThreadMessages(
  ctx: ListCtx,
  threadId: string,
): Promise<MessageDoc[]> {
  const out: MessageDoc[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page: PaginationResult<MessageDoc> = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId: threadId as never,
        order: "asc",
        paginationOpts: { cursor, numItems: 200 },
      },
    );
    out.push(...page.page);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  return out;
}

type MergedEntry = {
  payload?: unknown;
  entryTime: number;
};

function anchorRankTuple(
  entry: MergedEntry,
  anchorRank: Map<string, { order: number; stepOrder: number }>,
): [number, number, number] | null {
  const pa = (entry.payload ?? {}) as ChatActorTurnPayload;
  if (!pa.anchorMessageId) return null;
  const r = anchorRank.get(pa.anchorMessageId);
  if (!r) return null;
  return [r.order, r.stepOrder, entry.entryTime];
}

function compareMerged(
  a: MergedEntry,
  b: MergedEntry,
  anchorRank: Map<string, { order: number; stepOrder: number }>,
): number {
  const ra = anchorRankTuple(a, anchorRank);
  const rb = anchorRankTuple(b, anchorRank);
  if (ra && rb) {
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    if (ra[1] !== rb[1]) return ra[1] - rb[1];
    return ra[2] - rb[2];
  }
  if (ra && !rb) return -1;
  if (!ra && rb) return 1;
  const pa = (a.payload ?? {}) as ChatActorTurnPayload;
  const pb = (b.payload ?? {}) as ChatActorTurnPayload;
  const ta = pa.threadSeq ?? a.entryTime;
  const tb = pb.threadSeq ?? b.entryTime;
  if (ta !== tb) return ta - tb;
  return a.entryTime - b.entryTime;
}

export const mergedChatActorTurnTimeline = query({
  args: {
    threadId: v.string(),
    namespace: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const humanSid = chatActorStreamId(args.threadId, args.namespace);
    const asstSid = chatActorStreamId(args.threadId, ASSISTANT_ACTOR_KEY);
    const [humanEntries, asstEntries, messages] = await Promise.all([
      collectStreamEntries(ctx, humanSid),
      collectStreamEntries(ctx, asstSid),
      collectAllThreadMessages(ctx, args.threadId),
    ]);
    const anchorRank = new Map<string, { order: number; stepOrder: number }>();
    for (const m of messages) {
      anchorRank.set(m._id, { order: m.order, stepOrder: m.stepOrder });
    }
    const merged = [...humanEntries, ...asstEntries];
    merged.sort((a, b) => compareMerged(a, b, anchorRank));
    return merged;
  },
});
