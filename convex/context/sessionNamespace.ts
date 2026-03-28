import { z } from "zod/v4";
import { sessionQuery } from "../customFunctions";
import { expectedAccountNamespace } from "../models/auth/contextNamespace";

/** Returns the canonical `account:${id}` namespace for the linked session account, or null. */
export const getSessionContextNamespace = sessionQuery({
  args: z.object({}),
  handler: async (ctx) => {
    if (!ctx.account) return null;
    return { namespace: expectedAccountNamespace(ctx.account._id) };
  },
});
