import { v } from "convex/values";
import { dimensionKindValidator } from "../../domain/dimensions/fields.js";
import { query } from "../_generated/server.js";
import { normalizeStreamNamespace } from "../internal/shared.js";

export const listDimensions = query({
  args: {
    namespace: v.optional(v.string()),
    kind: dimensionKindValidator,
  },
  handler: async (ctx, args) => {
    const namespace = normalizeStreamNamespace(args.namespace);
    return await ctx.db
      .query("dimensions")
      .withIndex("by_namespace_kind_value", (q) =>
        q.eq("namespace", namespace).eq("kind", args.kind),
      )
      .collect();
  },
});
