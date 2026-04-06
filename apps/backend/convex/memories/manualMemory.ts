/**
 * Host mutations for manual memory UI flows — all delegate to {@link memoryClient}.
 */
import { v } from "convex/values";
import { memoryClient } from "../_clients/memory.js";
import type { Id } from "../_components/memory/_generated/dataModel.js";
import { DEFAULT_MANUAL_MEMORY_ONTOLOGY_NODE_LABEL } from "../_components/memory/graph.js";
import { mutation } from "../_generated/server.js";
import { requireGoogleApiKey } from "../env/models.js";

export const beginManualMemory = mutation({
  args: {
    namespace: v.string(),
    title: v.optional(v.string()),
    initialText: v.optional(v.string()),
  },
  returns: v.object({
    memoryRecordId: v.string(),
  }),
  handler: async (ctx, args) => {
    const key = `manual-${crypto.randomUUID()}`;
    const googleApiKey = requireGoogleApiKey();
    const text = args.initialText?.trim();
    const content = text ? [{ text: text }] : [];
    const result = await memoryClient.mergeMemory(ctx, {
      namespace: args.namespace,
      key,
      content,
      googleApiKey,
      ontologyNodeLabel: DEFAULT_MANUAL_MEMORY_ONTOLOGY_NODE_LABEL,
      ...(args.title?.trim() ? { title: args.title.trim() } : {}),
    });
    return {
      memoryRecordId: String(result.memoryRecordId),
    };
  },
});

export const appendManualMemoryText = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) {
      return null;
    }
    await memoryClient.mergeMemory(ctx, {
      namespace: args.namespace,
      mode: "append",
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
      content: [{ text: trimmed }],
      googleApiKey: requireGoogleApiKey(),
    });
    return null;
  },
});

export const patchMemoryTitle = mutation({
  args: {
    namespace: v.string(),
    memoryRecordId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memoryClient.patchMemoryRecordTitle(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId as Id<"memoryRecords">,
      title: args.title,
    });
    return null;
  },
});
