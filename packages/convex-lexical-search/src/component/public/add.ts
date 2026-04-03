import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.js";
import { mutation } from "../_generated/server.js";

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
    throw new Error("upsertItem: provide `text` and/or `textSlices`");
  }
  return merged;
}

export const upsertItem = mutation({
  args: {
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
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
  returns: v.id("searchItems"),
  handler: async (ctx, args) => {
    const updatedAt = args.updatedAt ?? Date.now();
    const slices = normalizeSlices(args.text, args.textSlices);

    const existingItem = await ctx.db
      .query("searchItems")
      .withIndex("by_namespace_sourceSystem_sourceRef", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("sourceSystem", args.sourceSystem)
          .eq("sourceRef", args.sourceRef),
      )
      .first();

    const itemPayload = {
      namespace: args.namespace,
      sourceSystem: args.sourceSystem,
      sourceRef: args.sourceRef,
      updatedAt,
      bucketId: args.bucketId,
      bucketType: args.bucketType,
      supersededAt: args.supersededAt,
      sourceVersion: args.sourceVersion,
    };

    let itemId: Id<"searchItems">;
    if (existingItem) {
      await ctx.db.patch(existingItem._id, itemPayload);
      itemId = existingItem._id;
    } else {
      itemId = await ctx.db.insert("searchItems", itemPayload);
    }

    const existingSlices = await ctx.db
      .query("searchTexts")
      .withIndex("by_namespace_searchItem", (q) =>
        q.eq("namespace", args.namespace).eq("searchItem", itemId),
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
        searchItem: itemId,
        propKey: slice.propKey,
        sourceSystem: args.sourceSystem,
        text: slice.text,
        updatedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, slicePayload);
      } else {
        await ctx.db.insert("searchTexts", slicePayload);
      }
    }

    return itemId;
  },
});

/**
 * Add or update a single text slice without removing other slices on the same item.
 */
export const appendTextSlice = mutation({
  args: {
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
    propKey: v.string(),
    text: v.string(),
    updatedAt: v.optional(v.number()),
  },
  returns: v.id("searchItems"),
  handler: async (ctx, args) => {
    const updatedAt = args.updatedAt ?? Date.now();

    const existingItem = await ctx.db
      .query("searchItems")
      .withIndex("by_namespace_sourceSystem_sourceRef", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("sourceSystem", args.sourceSystem)
          .eq("sourceRef", args.sourceRef),
      )
      .first();

    const itemPayload = {
      namespace: args.namespace,
      sourceSystem: args.sourceSystem,
      sourceRef: args.sourceRef,
      updatedAt,
    };

    let itemId: Id<"searchItems">;
    if (existingItem) {
      await ctx.db.patch(existingItem._id, itemPayload);
      itemId = existingItem._id;
    } else {
      itemId = await ctx.db.insert("searchItems", itemPayload);
    }

    const existingSlice = await ctx.db
      .query("searchTexts")
      .withIndex("by_namespace_searchItem_propKey", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("searchItem", itemId)
          .eq("propKey", args.propKey),
      )
      .first();

    const slicePayload = {
      namespace: args.namespace,
      searchItem: itemId,
      propKey: args.propKey,
      sourceSystem: args.sourceSystem,
      text: args.text,
      updatedAt,
    };

    if (existingSlice) {
      await ctx.db.patch(existingSlice._id, slicePayload);
    } else {
      await ctx.db.insert("searchTexts", slicePayload);
    }

    return itemId;
  },
});

export const deleteItem = mutation({
  args: {
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("searchItems")
      .withIndex("by_namespace_sourceSystem_sourceRef", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("sourceSystem", args.sourceSystem)
          .eq("sourceRef", args.sourceRef),
      )
      .first();

    if (!existing) {
      return null;
    }

    const deletions = [];
    for await (const row of ctx.db
      .query("searchTexts")
      .withIndex("by_namespace_searchItem", (q) =>
        q.eq("namespace", args.namespace).eq("searchItem", existing._id),
      )) {
      deletions.push(ctx.db.delete(row._id));
    }

    deletions.push(ctx.db.delete(existing._id));
    await Promise.all(deletions);
  },
});
