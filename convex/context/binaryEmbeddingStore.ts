import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  binaryEmbeddingCompletionArgs,
  binaryEmbeddingFailureArgs,
  binaryEmbeddingProcessArgs,
} from "./shared";

export const getBinaryEmbeddingProcess = internalQuery({
  args: {
    processId: v.id("binaryEmbeddingProcesses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.processId);
  },
});

export const createBinaryEmbeddingProcess = internalMutation({
  args: binaryEmbeddingProcessArgs,
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("binaryEmbeddingProcesses", {
      ...args,
      fileName: args.fileName ?? null,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markBinaryEmbeddingProcessDispatched = internalMutation({
  args: {
    processId: v.id("binaryEmbeddingProcesses"),
  },
  handler: async (ctx, args) => {
    const process = await ctx.db.get(args.processId);
    if (!process) {
      throw new Error(`Binary embedding process ${args.processId} was not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.processId, {
      status: "dispatched",
      attemptCount: process.attemptCount + 1,
      dispatchedAt: now,
      updatedAt: now,
    });
  },
});

export const markBinaryEmbeddingProcessCompleted = internalMutation({
  args: {
    processId: v.id("binaryEmbeddingProcesses"),
    entryId: v.string(),
    retrievalText: binaryEmbeddingCompletionArgs.retrievalText,
  },
  handler: async (ctx, args) => {
    const process = await ctx.db.get(args.processId);
    if (!process) {
      throw new Error(`Binary embedding process ${args.processId} was not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.processId, {
      status: "completed",
      entryId: args.entryId,
      retrievalText: args.retrievalText,
      completedAt: now,
      lastError: null,
      updatedAt: now,
    });
  },
});

export const markBinaryEmbeddingProcessFailed = internalMutation({
  args: binaryEmbeddingFailureArgs,
  handler: async (ctx, args) => {
    const process = await ctx.db.get(args.processId);
    if (!process) {
      throw new Error(`Binary embedding process ${args.processId} was not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.processId, {
      status: "failed",
      failedAt: now,
      lastError: args.error,
      updatedAt: now,
    });
  },
});
