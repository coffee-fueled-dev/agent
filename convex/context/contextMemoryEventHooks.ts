/**
 * App-level hooks for the context component’s embedded `events` (contextMemory streams).
 *
 * Imported from `convex/components/context/events.ts` when constructing `memoryEvents`.
 * Runs on the Convex **server** in the same isolate as the mutation or action that called
 * `EventsClient.appendToStream` (after the component append completes). The hook
 * receives the **caller’s** `ctx` so it can `runMutation` into app `internal.*` functions.
 */

import { internal } from "../_generated/api";
import type { EventsAppendHookCtx } from "../components/events/types";

export async function onContextMemoryAppend(
  ctx: EventsAppendHookCtx,
  entry: {
    eventType: string;
    streamType: string;
    namespace: string;
    streamId: string;
    eventId: string;
    globalSequence: number;
    eventTime: number;
  },
): Promise<void> {
  await ctx.runMutation(
    internal.context.memoryEventBridge.recordContextMemoryAppend,
    {
      eventType: entry.eventType,
      streamType: entry.streamType,
      namespace: entry.namespace,
      streamId: entry.streamId,
      eventId: entry.eventId,
      globalSequence: entry.globalSequence,
      eventTime: entry.eventTime,
    },
  );
}

export function logContextMemoryCheckpoint(
  _ctx: EventsAppendHookCtx,
  checkpoint: {
    projector: string;
    streamType: string;
    lastSequence: number;
  },
): void {
  console.log("[app] contextMemory projector checkpoint", checkpoint);
}
