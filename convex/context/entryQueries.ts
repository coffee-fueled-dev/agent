import { v } from "convex/values";
import { query } from "../_generated/server";
import { createContextClient } from "./contextClient";

export const getContextFile = query({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (!file) return null;
    const url = await ctx.storage.getUrl(file.storageId);
    return { mimeType: file.mimeType, fileName: file.fileName, url };
  },
});

export const getContextDetail = query({
  args: {
    namespace: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const detail = await createContextClient().getContextDetail(ctx, args);
    if (!detail) return null;

    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", detail.entryId))
      .first();
    const url = file ? await ctx.storage.getUrl(file.storageId) : null;

    return {
      ...detail,
      file: file
        ? {
            storageId: file.storageId,
            mimeType: file.mimeType,
            fileName: file.fileName,
            url,
          }
        : null,
    };
  },
});
