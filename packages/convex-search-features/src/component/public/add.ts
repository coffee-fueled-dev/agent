import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.js";
import { mutation } from "../_generated/server.js";
import { sourceRefValidator } from "../schema.js";

const textSliceValidator = v.object({
  propKey: v.string(),
  text: v.string(),
});

function normalizeSlices(
  text: string | undefined,
  textSlices: Array<{ propKey: string; text: string }> | undefined,
): Array<{ propKey: string; text: string }> {
  const merged = [...(textSlices ?? [])];
  if (text !== undefined && text.length > 0) {
    const idx = merged.findIndex((s) => s.propKey === "text");
    if (idx >= 0) merged[idx] = { propKey: "text", text };
    else merged.unshift({ propKey: "text", text });
  }
  if (merged.length === 0) {
    throw new Error("upsertFeature: provide `text` and/or `textSlices`");
  }
  return merged;
}

export const upsertFeature = mutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
    sourceSystem: v.string(),
    sourceRef: sourceRefValidator,
    title: v.optional(v.string()),
    bucketId: v.optional(v.string()),
    bucketType: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
    sourceVersion: v.optional(v.number()),
    /** Shorthand for a single slice with `propKey` `"text"`. */
    text: v.optional(v.string()),
    /** Named searchable slices; merged with `text` when both are set. */
    textSlices: v.optional(v.array(textSliceValidator)),
    updatedAt: v.optional(v.number()),
  },
  returns: v.id("searchFeatureItems"),
  handler: async (ctx, args) => {
    const updatedAt = args.updatedAt ?? Date.now();
    const slices = normalizeSlices(args.text, args.textSlices);

    const existingItem = await ctx.db
      .query("searchFeatureItems")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .first();

    const itemPayload = {
      namespace: args.namespace,
      featureId: args.featureId,
      sourceSystem: args.sourceSystem,
      sourceRef: args.sourceRef,
      title: args.title,
      updatedAt,
      bucketId: args.bucketId,
      bucketType: args.bucketType,
      supersededAt: args.supersededAt,
      sourceVersion: args.sourceVersion,
    };

    let itemId: Id<"searchFeatureItems">;
    if (existingItem) {
      await ctx.db.patch(existingItem._id, itemPayload);
      itemId = existingItem._id;
    } else {
      itemId = await ctx.db.insert("searchFeatureItems", itemPayload);
    }

    const existingSlices = await ctx.db
      .query("searchFeatureTextSlices")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .collect();

    const newKeys = new Set(slices.map((s) => s.propKey));
    for (const row of existingSlices) {
      if (!newKeys.has(row.propKey)) {
        await ctx.db.delete(row._id);
      }
    }

    for (const slice of slices) {
      const existing = existingSlices.find((r) => r.propKey === slice.propKey);
      const slicePayload = {
        namespace: args.namespace,
        featureId: args.featureId,
        propKey: slice.propKey,
        sourceSystem: args.sourceSystem,
        text: slice.text,
        updatedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, slicePayload);
      } else {
        await ctx.db.insert("searchFeatureTextSlices", slicePayload);
      }
    }

    return itemId;
  },
});

export const deleteFeature = mutation({
  args: {
    namespace: v.string(),
    featureId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slices = await ctx.db
      .query("searchFeatureTextSlices")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .collect();
    for (const row of slices) {
      await ctx.db.delete(row._id);
    }

    const existing = await ctx.db
      .query("searchFeatureItems")
      .withIndex("by_namespace_featureId", (q) =>
        q.eq("namespace", args.namespace).eq("featureId", args.featureId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
