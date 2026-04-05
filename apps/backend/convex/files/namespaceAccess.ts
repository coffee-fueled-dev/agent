import { v } from "convex/values";
import { internalQuery } from "../_generated/server.js";
import { canAccessStorageInNamespace } from "./storageAccess.js";

/**
 * Same grant as {@link canAccessStorageInNamespace}, exposed for `runQuery` from actions
 * (see {@link mintFileUrlForNamespace} — no duplicated index logic).
 */
export const namespaceStorageAccess = internalQuery({
  args: {
    namespace: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    canAccessStorageInNamespace(ctx.db, args.namespace, args.storageId),
});
