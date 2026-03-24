import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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
    const now = Date.now();
    return await ctx.db.insert("contextFileProcesses", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markDispatched = internalMutation({
  args: { processId: v.id("contextFileProcesses") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.processId, {
      status: "dispatched",
      updatedAt: Date.now(),
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
      status: "completed",
      entryId: args.entryId,
      error: undefined,
      updatedAt: Date.now(),
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
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const insertContextFile = internalMutation({
  args: {
    entryId: v.string(),
    namespace: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contextFiles", {
      ...args,
      createdAt: Date.now(),
    });
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
