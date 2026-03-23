import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

export const contextFileCompletePath = "/context/file/complete";
export const contextFileFailPath = "/context/file/fail";

function getSecret() {
  return (
    process.env.BINARY_EMBEDDING_SECRET?.trim() ||
    "dev-only-binary-embedding-secret"
  );
}

function isAuthorized(request: Request) {
  return request.headers.get("x-binary-embedding-secret") === getSecret();
}

function parseCompletionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expected JSON object");
  }
  const { processId, retrievalText, chunks } = payload as Record<
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
    processId,
    retrievalText,
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
    const { processId, retrievalText, chunks } = parseCompletionPayload(
      await request.json(),
    );
    const process = await ctx.runQuery(
      internal.context.fileStore.getFileProcess,
      { processId: processId as never },
    );
    if (!process) {
      return Response.json({ error: "Process not found" }, { status: 404 });
    }
    if (process.entryId) {
      return Response.json({
        entryId: process.entryId,
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
    const payload = (await request.json()) as Record<string, unknown>;
    if (typeof payload?.processId !== "string") {
      throw new Error("Missing processId");
    }
    const errorMsg =
      typeof payload.error === "string" ? payload.error : "Embedding failed";
    await ctx.runMutation(internal.context.fileStore.markFailed, {
      processId: payload.processId as never,
      error: errorMsg,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
});
