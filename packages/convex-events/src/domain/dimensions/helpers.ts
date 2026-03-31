import type { GenericMutationCtx } from "convex/server";
import type { DimensionKind } from "./fields.js";
import type { ExpectedDataModel, ExpectedId } from "./types.js";

/**
 * Upsert a dimension row. Returns the ID of the existing or newly created row.
 * Works against any Convex db with a dimensions table that has the standard
 * `by_namespace_kind_value` index and dimension fields.
 */
export async function getOrCreateDimensionId(
  ctx: GenericMutationCtx<ExpectedDataModel>,
  args: { namespace: string; kind: DimensionKind; value: string },
): Promise<ExpectedId<"dimensions">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("dimensions")
    .withIndex("by_namespace_kind_value", (q) =>
      q
        .eq("namespace", args.namespace)
        .eq("kind", args.kind)
        .eq("value", args.value),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { lastSeenAt: now });
    return existing._id;
  }
  return await ctx.db.insert("dimensions", {
    namespace: args.namespace,
    kind: args.kind,
    value: args.value,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}
