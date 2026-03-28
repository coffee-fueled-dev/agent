import { v } from "convex/values";
import { sessionContextEntryPaginatedQuery } from "../customFunctions";
import { query } from "../_generated/server";
import { createContextClient } from "./contextClient";

export const listContextEntryAccessEvents = sessionContextEntryPaginatedQuery({
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
