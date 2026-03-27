import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { history } from "../history";

const historyEntryValidator = v.object({
  streamType: v.string(),
  streamId: v.string(),
  entryId: v.string(),
  kind: v.string(),
  entryTime: v.number(),
  parentEntryIds: v.array(v.string()),
  payload: v.optional(v.any()),
  author: v.optional(v.object({ byId: v.string(), byType: v.string() })),
  attrs: v.optional(
    v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null()),
    ),
  ),
});

export const appendHistoryEntry = internalMutation({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    kind: v.string(),
    payload: v.optional(v.any()),
    parentEntryIds: v.optional(v.array(v.string())),
    entryTime: v.optional(v.number()),
  },
  returns: historyEntryValidator,
  handler: async (ctx, args) => {
    return await history.append(
      ctx,
      args as Parameters<typeof history.append>[1],
    );
  },
});

export const getVersionChain = internalQuery({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
  },
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    return await history.getPathToRoot(
      ctx,
      args as Parameters<typeof history.getPathToRoot>[1],
    );
  },
});

export const listHistoryHeads = internalQuery({
  args: {
    streamType: v.string(),
    streamId: v.string(),
  },
  returns: v.array(
    v.object({
      streamType: v.string(),
      streamId: v.string(),
      entryId: v.string(),
      headKind: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await history.listHeads(
      ctx,
      args as Parameters<typeof history.listHeads>[1],
    );
  },
});
