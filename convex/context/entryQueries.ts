import { z } from "zod/v4";
import { sessionQuery } from "../customFunctions";
import { createContextClient } from "./contextClient";

export const getContextFile = sessionQuery({
  args: { entryId: z.string() },
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

export const getContextDetail = sessionQuery({
  args: {
    namespace: z.string(),
    entryId: z.string(),
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
