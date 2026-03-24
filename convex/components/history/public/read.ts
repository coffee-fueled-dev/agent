import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import { query } from "../_generated/server";
import {
  getPrimaryPathToRoot,
  isAncestorEntry,
  latestCommonAncestor,
  loadChildren,
  loadEntryByRef,
  loadParents,
} from "../internal/graph";
import {
  entryRefFields,
  historyEntryValidator,
  streamRefFields,
  stripSystemFields,
} from "../internal/shared";
import schema from "../schema";

export const getEntry = query({
  args: entryRefFields,
  returns: v.union(historyEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entry = await loadEntryByRef(ctx, args);
    return entry ? stripSystemFields(entry) : null;
  },
});

export const listEntries = query({
  args: {
    ...streamRefFields,
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("history_entries")
      .withIndex("by_stream_time", (q) =>
        q.eq("streamType", args.streamType).eq("streamId", args.streamId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getParents = query({
  args: entryRefFields,
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    return (await loadParents(ctx, args)).map(stripSystemFields);
  },
});

export const getChildren = query({
  args: entryRefFields,
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    return (await loadChildren(ctx, args)).map(stripSystemFields);
  },
});

export const getPathToRoot = query({
  args: entryRefFields,
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    return (await getPrimaryPathToRoot(ctx, args)).map(stripSystemFields);
  },
});

export const isAncestor = query({
  args: {
    ...streamRefFields,
    ancestorEntryId: v.string(),
    descendantEntryId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await isAncestorEntry(ctx, args);
  },
});

export const getLatestCommonAncestor = query({
  args: {
    ...streamRefFields,
    leftEntryId: v.string(),
    rightEntryId: v.string(),
  },
  returns: v.union(historyEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entry = await latestCommonAncestor(ctx, args);
    return entry ? stripSystemFields(entry) : null;
  },
});
