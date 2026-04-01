import { v } from "convex/values";
import { mutation } from "../_generated/server.js";
import {
  assertEntryDoesNotExist,
  assertParentsExistInStream,
  computeNextHeads,
  listHeadsForStream,
} from "../internal/graph.js";
import {
  historyEntryValidator,
  metadataValidator,
  normalizeParentEntryIds,
} from "../internal/shared.js";

export const append = mutation({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    kind: v.string(),
    payload: v.optional(v.any()),
    parentEntryIds: v.optional(v.array(v.string())),
    entryTime: v.optional(v.number()),
    attrs: metadataValidator,
  },
  returns: historyEntryValidator,
  handler: async (ctx, args) => {
    const parentEntryIds = normalizeParentEntryIds(args.parentEntryIds);

    await assertEntryDoesNotExist(ctx, args);
    await assertParentsExistInStream(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
      parentEntryIds,
    });

    const entry = {
      streamType: args.streamType,
      streamId: args.streamId,
      entryId: args.entryId,
      kind: args.kind,
      payload: args.payload,
      parentEntryIds,
      entryTime: args.entryTime ?? Date.now(),
      attrs: args.attrs,
    };

    await ctx.db.insert("history_entries", entry);

    for (const [parentOrder, parentEntryId] of parentEntryIds.entries()) {
      await ctx.db.insert("history_parent_edges", {
        streamType: args.streamType,
        streamId: args.streamId,
        childEntryId: args.entryId,
        parentEntryId,
        parentOrder,
      });
    }

    const currentHeads = await listHeadsForStream(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
    });
    const nextHeads = computeNextHeads(currentHeads, parentEntryIds, {
      entryId: args.entryId,
      kind: args.kind,
    });

    for (const head of nextHeads.remove) {
      await ctx.db.delete(head._id);
    }

    if (nextHeads.shouldInsert) {
      await ctx.db.insert("history_heads", {
        streamType: args.streamType,
        streamId: args.streamId,
        entryId: nextHeads.next.entryId,
        headKind: nextHeads.next.headKind,
      });
    }

    return entry;
  },
});
