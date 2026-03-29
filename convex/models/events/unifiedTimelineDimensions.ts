import { defineTable } from "convex/server";
import { v } from "convex/values";

export const dimensionKindValidator = v.union(
  v.literal("eventType"),
  v.literal("sourceStreamType"),
);

/** Distinct filter values per account namespace (upserted by the unified timeline projector). */
export const unifiedTimelineDimensions = defineTable({
  namespace: v.string(),
  kind: dimensionKindValidator,
  value: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
})
  .index("by_namespace_kind", ["namespace", "kind"])
  .index("by_namespace_kind_value", ["namespace", "kind", "value"]);
