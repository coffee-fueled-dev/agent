import { fingerprintClient } from "../_clients/fingerprints.js";
import { memoryClient } from "../_clients/memory.js";
import { internal } from "../_generated/api.js";

let registered = false;

/**
 * One-time subscribers: fingerprints + memory client (`searchMemory` carries RRF-composed hits only).
 * Idempotent; safe to call from every {@link continueThreadStream} run.
 */
export function ensureObservabilityWiring(): void {
  if (registered) {
    return;
  }
  registered = true;

  fingerprintClient.subscribe("observability", async (ctx, payload) => {
    const threadId =
      payload.event === "recordEvaluation" ||
      payload.event === "recordEvaluationForRegisteredAgent"
        ? payload.args.threadId
        : undefined;
    if (!threadId) {
      return;
    }
    const userId = await ctx.runQuery(
      internal.observability.lookup.getUserIdForThread,
      { threadId },
    );
    if (!userId) {
      return;
    }
    await ctx.runMutation(internal.observability.append.appendFingerprint, {
      userId,
      threadId,
      eventId: crypto.randomUUID(),
      payload,
    });
  });

  memoryClient.subscribe("observability", async (ctx, payload) => {
    const userId = payload.args.namespace;
    if (payload.event === "mergeMemory") {
      await ctx.runMutation(internal.observability.append.appendMemoryMerge, {
        userId,
        payload,
      });
      return;
    }
    if (payload.event === "searchMemory") {
      await ctx.runMutation(internal.observability.append.appendMemorySearch, {
        userId,
        payload,
      });
      return;
    }
    if (payload.event === "registerStorageSourceMetadata") {
      await ctx.runMutation(
        internal.observability.append.appendRegisterStorageSourceMetadata,
        {
          userId,
          payload,
        },
      );
    }
  });
}
