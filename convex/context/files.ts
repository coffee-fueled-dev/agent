import { z } from "zod/v4";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { sessionAction, sessionMutation } from "../customFunctions";
import { accountActor } from "../eventAttribution";
import { assertAccountNamespace } from "../models/auth/contextNamespace";
import {
  createContextClient,
  getConvexSiteUrl,
  getEmbeddingServerUrl,
  getFileEmbeddingSecret,
} from "./contextClient";

export const generateContextUploadUrl = sessionMutation({
  args: z.object({}),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addFileContext = sessionAction({
  args: {
    namespace: z.string(),
    key: z.string(),
    title: z.string().optional(),
    text: z.string().optional(),
    storageId: z.string(),
    mimeType: z.string(),
    fileName: z.string().optional(),
    contentHash: z.string().optional(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { entryId: string; status: "completed" }
    | { processId: Id<"contextFileProcesses">; status: "dispatched" }
  > => {
    const accountId = await ctx.runQuery(
      internal.sessionResolve.getAccountIdForConvexSession,
      { convexSessionId: args.sessionId },
    );
    assertAccountNamespace(accountId, args.namespace);
    const {
      text,
      storageId: storageIdArg,
      mimeType,
      fileName,
      contentHash: _,
      sessionId,
      ...entry
    } = args;
    const storageId = storageIdArg as Id<"_storage">;

    if (text) {
      const client = createContextClient();
      const result = await client.addContext(ctx, {
        ...entry,
        text,
        session: sessionId,
        actor: accountId ? accountActor(accountId) : undefined,
      });
      await ctx.runMutation(internal.context.fileStore.insertContextFile, {
        entryId: result.entryId,
        namespace: args.namespace,
        storageId,
        mimeType,
        fileName,
      });
      return { entryId: result.entryId, status: "completed" };
    }

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
            contentHash: args.contentHash,
            lexicalSummaryMode: "tiny",
            completeUrl: `${baseUrl}/context/file/complete`,
            failUrl: `${baseUrl}/context/file/fail`,
            cacheCompleteUrl: `${baseUrl}/embedding-cache/complete`,
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
