import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { normalizeLabel } from "./normalize.js";

/** Lookup normalized label row id; does not insert. */
export async function getGraphLabelId(
  ctx: QueryCtx | MutationCtx,
  displayLabel: string,
  kind: "node" | "edge",
): Promise<Id<"graph_labels"> | null> {
  const normalized = normalizeLabel(displayLabel);
  const row = await ctx.db
    .query("graph_labels")
    .withIndex("by_type_value", (q) =>
      q.eq("type", kind).eq("value", normalized),
    )
    .first();
  return row?._id ?? null;
}

/** Ensures a `graph_labels` row exists for this display string; returns its id. */
export async function getOrCreateGraphLabelId(
  ctx: MutationCtx,
  displayLabel: string,
  kind: "node" | "edge",
): Promise<Id<"graph_labels">> {
  const normalized = normalizeLabel(displayLabel);
  const existing = await ctx.db
    .query("graph_labels")
    .withIndex("by_type_value", (q) =>
      q.eq("type", kind).eq("value", normalized),
    )
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("graph_labels", {
    value: normalized,
    displayValue: displayLabel,
    type: kind,
  });
}

/** Counter keys use normalized `value` (e.g. `edges:similar_to`). */
export async function graphLabelNormalizedValue(
  ctx: QueryCtx | MutationCtx,
  labelId: Id<"graph_labels">,
): Promise<string> {
  const doc = await ctx.db.get(labelId);
  if (!doc) {
    throw new Error(`graphLabelNormalizedValue: missing graph_labels ${labelId}`);
  }
  return doc.value;
}
