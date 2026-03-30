import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { getFileEmbeddingSecret } from "../env";

export const contextFileCompletePath = "/context/file/complete";
export const contextFileFailPath = "/context/file/fail";

function getSecret() {
  return getFileEmbeddingSecret();
}

function isAuthorized(request: Request) {
  return request.headers.get("x-binary-embedding-secret") === getSecret();
}

function parseCompletionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expected JSON object");
  }
  const { processId, retrievalText, lexicalText, chunks } = payload as Record<
    string,
    unknown
  >;
  if (
    typeof processId !== "string" ||
    typeof retrievalText !== "string" ||
    !Array.isArray(chunks)
  ) {
    throw new Error("Missing required fields");
  }
  return {
    processId: processId as Id<"contextFileProcesses">,
    retrievalText,
    lexicalText: typeof lexicalText === "string" ? lexicalText : undefined,
    chunks: chunks.map((c: unknown) => {
      const chunk = c as Record<string, unknown>;
      if (
        typeof chunk?.text !== "string" ||
        !Array.isArray(chunk?.embedding) ||
        chunk.embedding.some((v: unknown) => typeof v !== "number")
      ) {
        throw new Error("Invalid chunk");
      }
      return {
        text: chunk.text as string,
        embedding: chunk.embedding as number[],
      };
    }),
  };
}

export const completeFileProcessHttp = httpAction(async (ctx, request) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { processId, retrievalText, lexicalText, chunks } =
      parseCompletionPayload(await request.json());
    const process = await ctx.runQuery(
      internal.context.fileStore.getFileProcess,
      { processId: processId as Id<"contextFileProcesses"> },
    );
    if (!process) {
      return Response.json({ error: "Process not found" }, { status: 404 });
    }
    if (process.data.status === "completed") {
      return Response.json({
        entryId: process.data.entryId,
        status: "already_completed",
      });
    }

    const result = await ctx.runAction(
      internal.context.fileHttpActions.completeFileProcess,
      {
        processId,
        namespace: process.namespace,
        key: process.key,
        title: process.title,
        storageId: process.storageId,
        mimeType: process.mimeType,
        fileName: process.fileName,
        retrievalText,
        lexicalText,
        chunks,
      },
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Completion failed",
      },
      { status: 400 },
    );
  }
});

export const failFileProcessHttp = httpAction(async (ctx, request) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const payload = await request.json();
    if (typeof payload?.processId !== "string") {
      throw new Error("Missing processId");
    }
    const errorMsg =
      typeof payload.error === "string" ? payload.error : "Embedding failed";
    const processId = payload.processId as string;
    // embed-for-search uses synthetic ids (`search-${contentHash}`); no file process row.
    if (!processId.startsWith("search-")) {
      await ctx.runMutation(internal.context.fileStore.markFailed, {
        processId: processId as Id<"contextFileProcesses">,
        error: errorMsg,
      });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
});
