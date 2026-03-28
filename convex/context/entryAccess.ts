import { z } from "zod/v4";
import {
  sessionPaginatedQuery,
  sessionQuery,
} from "../customFunctions";
import { createContextClient } from "./contextClient";

export const listContextEntryAccessEvents = sessionPaginatedQuery({
  args: {
    namespace: z.string(),
    entryId: z.string(),
  },
  handler: async (ctx, args) => {
    return await createContextClient().listEntryAccessEvents(ctx, args);
  },
});

export const getContextEntryAccessEvent = sessionQuery({
  args: {
    namespace: z.string(),
    entryId: z.string(),
    eventId: z.string(),
  },
  handler: async (ctx, args) => {
    return await createContextClient().getEntryAccessEvent(ctx, args);
  },
});

export const getContextEntryAccessWeekByDay = sessionQuery({
  args: { namespace: z.string(), entryId: z.string() },
  handler: async (ctx, args) => {
    return await createContextClient().getEntryAccessWeekByDay(ctx, args);
  },
});
