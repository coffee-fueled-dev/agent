import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { createContextClient } from "./contextClient";

export const listContextEntryAccessEvents = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await createContextClient().listEntryAccessEvents(ctx, args);
  },
});

export const getContextEntryAccessEvent = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    return await createContextClient().getEntryAccessEvent(ctx, args);
  },
});

export const getContextEntryAccessWeekByDay = query({
  args: { namespace: v.string(), entryId: v.string() },
  handler: async (ctx, args) => {
    return await createContextClient().getEntryAccessWeekByDay(ctx, args);
  },
});
