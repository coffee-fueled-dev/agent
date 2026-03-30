import { v } from "convex/values";
import { withoutSystemFields } from "convex-helpers";
import { doc } from "convex-helpers/validators";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import schema from "../schema";

export const getFileProcess = internalQuery({
  args: { processId: v.id("contextFileProcesses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.processId);
  },
});

export const createFileProcess = internalMutation({
  args: {
    storageId: v.id("_storage"),
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextFileProcesses", {
      ...args,
      updatedAt: Date.now(),
      data: { status: "pending" },
    });
  },
});

export const markDispatched = internalMutation({
  args: { processId: v.id("contextFileProcesses") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      updatedAt: Date.now(),
      data: { status: "dispatched" },
    });
  },
});

export const markCompleted = internalMutation({
  args: {
    processId: v.id("contextFileProcesses"),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      updatedAt: Date.now(),
      data: { status: "completed", entryId: args.entryId },
    });
  },
});

export const markFailed = internalMutation({
  args: {
    processId: v.id("contextFileProcesses"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      updatedAt: Date.now(),
      data: { status: "failed", error: args.error },
    });
  },
});

export const insertContextFile = internalMutation({
  args: withoutSystemFields(doc(schema, "contextFiles").fields),
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextFiles", args);
  },
});

/** Same order as `entryIds`; null when no row for that entry in the namespace. */
export const getContextFilesForEntryIdsBatch = internalQuery({
  args: {
    namespace: v.string(),
    entryIds: v.array(v.string()),
  },
  returns: v.array(
    v.union(
      v.null(),
      v.object({
        entryId: v.string(),
        storageId: v.id("_storage"),
        mimeType: v.string(),
        fileName: v.optional(v.string()),
      }),
    ),
  ),
  handler: async (ctx, args) => {
    const out: Array<{
      entryId: string;
      storageId: Id<"_storage">;
      mimeType: string;
      fileName?: string;
    } | null> = [];
    for (const entryId of args.entryIds) {
      const row = await ctx.db
        .query("contextFiles")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .first();
      if (row && row.namespace === args.namespace) {
        out.push({
          entryId,
          storageId: row.storageId,
          mimeType: row.mimeType,
          fileName: row.fileName,
        });
      } else {
        out.push(null);
      }
    }
    return out;
  },
});

export const deleteContextFile = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();
    if (file) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }
  },
});

export const updateContextFileEntryId = internalMutation({
  args: { oldEntryId: v.string(), newEntryId: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.oldEntryId))
      .first();
    if (file) {
      await ctx.db.patch(file._id, { entryId: args.newEntryId });
    }
  },
});
