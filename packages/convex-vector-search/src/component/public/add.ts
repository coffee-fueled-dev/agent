import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.js";
import { EMBEDDING_DIMENSIONS } from "../schema.js";
import { mutation } from "../_generated/server.js";

const embeddingSliceValidator = v.object({
  propKey: v.string(),
  sliceId: v.optional(v.string()),
  embedding: v.array(v.float64()),
});

function assertEmbeddingDim(embedding: number[], label: string) {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `${label}: expected embedding length ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    );
  }
}

function normalizeSlices(
  embedding: number[] | undefined,
  embeddingSlices:
    | Array<{ propKey: string; sliceId?: string; embedding: number[] }>
    | undefined,
): Array<{ propKey: string; sliceId: string; embedding: number[] }> {
  const merged = [...(embeddingSlices ?? [])];
  if (embedding !== undefined && embedding.length > 0) {
    assertEmbeddingDim(embedding, "embedding");
    const idx = merged.findIndex(
      (s) => s.propKey === "embedding" && (s.sliceId ?? "") === "",
    );
    if (idx >= 0)
      merged[idx] = { propKey: "embedding", sliceId: "", embedding };
    else
      merged.unshift({ propKey: "embedding", sliceId: "", embedding });
  }
  if (merged.length === 0) {
    throw new Error("upsertItem: provide `embedding` and/or `embeddingSlices`");
  }
  return merged.map((s) => {
    assertEmbeddingDim(s.embedding, `embeddingSlices.${s.propKey}`);
    return {
      propKey: s.propKey,
      sliceId: s.sliceId ?? "",
      embedding: s.embedding,
    };
  });
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
    /** Shorthand for a single slice with `propKey` `"embedding"` and `sliceId` `""`. */
    embedding: v.optional(v.array(v.float64())),
    /** Named embedding slices; merged with `embedding` when both are set. */
    embeddingSlices: v.optional(v.array(embeddingSliceValidator)),
    updatedAt: v.optional(v.number()),
  },
  returns: v.id("searchItems"),
  handler: async (ctx, args) => {
    const updatedAt = args.updatedAt ?? Date.now();
    const slices = normalizeSlices(args.embedding, args.embeddingSlices);

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
      .query("searchEmbeddings")
      .withIndex("by_namespace_searchItem", (q) =>
        q.eq("namespace", args.namespace).eq("searchItem", itemId),
      )
      .collect();

    const newKeys = new Set(slices.map((s) => `${s.propKey}\0${s.sliceId}`));
    for (const row of existingSlices) {
      const key = `${row.propKey}\0${row.sliceId}`;
      if (!newKeys.has(key)) {
        await ctx.db.delete(row._id);
      }
    }

    for (const slice of slices) {
      const existing = existingSlices.find(
        (r) => r.propKey === slice.propKey && r.sliceId === slice.sliceId,
      );
      const slicePayload = {
        namespace: args.namespace,
        searchItem: itemId,
        propKey: slice.propKey,
        sliceId: slice.sliceId,
        sourceSystem: args.sourceSystem,
        embedding: slice.embedding,
        updatedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, slicePayload);
      } else {
        await ctx.db.insert("searchEmbeddings", slicePayload);
      }
    }

    return itemId;
  },
});

/**
 * Add or update a single embedding slice without removing other slices on the same item.
 */
export const appendEmbeddingSlice = mutation({
  args: {
    namespace: v.string(),
    sourceSystem: v.string(),
    sourceRef: v.string(),
    propKey: v.string(),
    sliceId: v.optional(v.string()),
    embedding: v.array(v.float64()),
    updatedAt: v.optional(v.number()),
  },
  returns: v.id("searchItems"),
  handler: async (ctx, args) => {
    assertEmbeddingDim(args.embedding, "appendEmbeddingSlice");
    const updatedAt = args.updatedAt ?? Date.now();
    const sliceId = args.sliceId ?? "";

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
      .query("searchEmbeddings")
      .withIndex("by_namespace_searchItem_propKey_sliceId", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("searchItem", itemId)
          .eq("propKey", args.propKey)
          .eq("sliceId", sliceId),
      )
      .first();

    const slicePayload = {
      namespace: args.namespace,
      searchItem: itemId,
      propKey: args.propKey,
      sliceId,
      sourceSystem: args.sourceSystem,
      embedding: args.embedding,
      updatedAt,
    };

    if (existingSlice) {
      await ctx.db.patch(existingSlice._id, slicePayload);
    } else {
      await ctx.db.insert("searchEmbeddings", slicePayload);
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
      .query("searchEmbeddings")
      .withIndex("by_namespace_searchItem", (q) =>
        q.eq("namespace", args.namespace).eq("searchItem", existing._id),
      )) {
      deletions.push(ctx.db.delete(row._id));
    }

    deletions.push(ctx.db.delete(existing._id));
    await Promise.all(deletions);
    return null;
  },
});
