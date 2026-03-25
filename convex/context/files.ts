import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, mutation } from "../_generated/server";
import { ContextClient } from "../components/context/client";
import { embedText } from "./embedding";

function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

function getSearchFeatureId(entryId: string) {
  return `context:entry:${entryId}`;
}

function getEmbeddingServerUrl() {
  return process.env.EMBEDDING_SERVER_URL?.trim() || "http://127.0.0.1:3031";
}

function getFileEmbeddingSecret() {
  return (
    process.env.BINARY_EMBEDDING_SECRET?.trim() ||
    "dev-only-binary-embedding-secret"
  );
}

function getConvexSiteUrl() {
  const url =
    process.env.CONVEX_SITE_URL?.trim() || process.env.CONVEX_URL?.trim();
  if (!url) throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
  return url.replace(/\/+$/, "");
}

export const generateContextUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addFileContext = action({
  args: {
    namespace: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { entryId: string; status: "completed" }
    | { processId: Id<"contextFileProcesses">; status: "dispatched" }
  > => {
    const { text, storageId, mimeType, fileName, ...entry } = args;

    if (text) {
      const client = createContextClient();
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const embedding = await embedText(text, apiKey);
      const result = await client.add(ctx, {
        ...entry,
        text,
        chunks: [{ text, embedding }],
        filterValues: [{ name: "status", value: "current" }],
      });
      await ctx.runMutation(internal.context.fileStore.insertContextFile, {
        entryId: result.entryId,
        namespace: args.namespace,
        storageId,
        mimeType,
        fileName,
      });
      await ctx.runMutation(internal.context.embedding.insertEmbedding, {
        entryId: result.entryId,
        namespace: args.namespace,
        embedding,
      });
      await client.upsertSearchFeature(ctx, {
        namespace: args.namespace,
        featureId: getSearchFeatureId(result.entryId),
        sourceSystem: "context",
        source: {
          kind: "document",
          document: "contextEntries",
          documentId: result.entryId,
          entryId: result.entryId,
          key: args.key,
          sourceType: "text",
        },
        title: args.title,
        text,
        status: "current",
      } as never);
      await ctx.runMutation(internal.context.embedding.markProjectionsStale, {
        namespace: args.namespace,
      });
      return { entryId: result.entryId, status: "completed" };
    }

    // Binary file — dispatch to embedding server
    const processId: Id<"contextFileProcesses"> = await ctx.runMutation(
      internal.context.fileStore.createFileProcess,
      {
        storageId,
        namespace: args.namespace,
        key: args.key,
        title: args.title,
        mimeType,
        fileName,
      },
    );

    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) throw new Error(`Could not resolve URL for ${storageId}`);

    const baseUrl = getConvexSiteUrl();
    try {
      const response = await fetch(
        `${getEmbeddingServerUrl().replace(/\/+$/, "")}/embed`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-binary-embedding-secret": getFileEmbeddingSecret(),
          },
          body: JSON.stringify({
            processId,
            fileUrl,
            namespace: args.namespace,
            title: args.title,
            mimeType,
            fileName: fileName ?? null,
            // Optional contract for embedding workers that can emit a small lexical summary.
            lexicalSummaryMode: "tiny",
            completeUrl: `${baseUrl}/context/file/complete`,
            failUrl: `${baseUrl}/context/file/fail`,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Embedding server rejected the job (${response.status})`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dispatch failed";
      await ctx.runMutation(internal.context.fileStore.markFailed, {
        processId,
        error: message,
      });
      throw error;
    }

    await ctx.runMutation(internal.context.fileStore.markDispatched, {
      processId,
    });

    return { processId, status: "dispatched" };
  },
});
