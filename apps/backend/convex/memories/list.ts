/**
 * Paginated memory record list for UIs (`api.memories.list.*`).
 * Namespace is the caller’s `userId` (account token).
 */
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { memoryClient } from "../_clients/memory.js";
import { query } from "../_generated/server.js";

export const listMemoryRecordsForSession = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    return await memoryClient.listMemoryRecordsPaginated(ctx, {
      namespace: args.userId,
      paginationOpts: args.paginationOpts,
    });
  },
});
