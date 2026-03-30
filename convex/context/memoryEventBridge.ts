import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * App-level internal mutations invoked from `EventsConfig.onAppend` / hooks via
 * `ctx.runMutation(internal.context.memoryEventBridge.*, …)` (caller passes app `ctx`).
 */
export const recordContextMemoryAppend = internalMutation({
  args: {
    eventType: v.string(),
    streamType: v.string(),
    namespace: v.string(),
    streamId: v.string(),
    eventId: v.string(),
    globalSequence: v.number(),
    eventTime: v.number(),
  },
  handler: async (_ctx, args) => {
    console.log("[internal] contextMemory append", args);
  },
});
