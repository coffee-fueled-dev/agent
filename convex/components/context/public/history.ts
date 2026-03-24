import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { history } from "../history";

export const appendHistoryEntry = mutation({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
    kind: v.string(),
    payload: v.optional(v.any()),
    parentEntryIds: v.optional(v.array(v.string())),
    entryTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await history.append(
      ctx,
      args as Parameters<typeof history.append>[1],
    );
  },
});

export const getVersionChain = query({
  args: {
    streamType: v.string(),
    streamId: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await history.getPathToRoot(
      ctx,
      args as Parameters<typeof history.getPathToRoot>[1],
    );
  },
});

export const listHistoryHeads = query({
  args: {
    streamType: v.string(),
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await history.listHeads(
      ctx,
      args as Parameters<typeof history.listHeads>[1],
    );
  },
});
