import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getBinaryEmbeddingSecret } from "./shared";

export const binaryEmbeddingCompletePath = "/context/binary-embedding/complete";
export const binaryEmbeddingFailPath = "/context/binary-embedding/fail";

function isAuthorized(request: Request) {
  return (
    request.headers.get("x-binary-embedding-secret") ===
    getBinaryEmbeddingSecret()
  );
}

function readErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error;
  }
  return "Binary embedding worker failed";
}

function readCompletionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expected a JSON object payload");
  }
  const {
    processId,
    retrievalText,
    chunks,
  } = payload as {
    processId?: string;
    retrievalText?: string;
    chunks?: Array<{
      text?: string;
      embedding?: number[];
    }>;
  };
  if (!processId || !retrievalText || !Array.isArray(chunks)) {
    throw new Error("Missing completion payload fields");
  }
  const normalizedChunks = chunks.map((chunk) => {
    if (
      !chunk ||
      typeof chunk.text !== "string" ||
      !Array.isArray(chunk.embedding) ||
      chunk.embedding.some((value) => typeof value !== "number")
    ) {
      throw new Error("Invalid embedding chunk payload");
    }
    return {
      text: chunk.text,
      embedding: chunk.embedding,
    };
  });
  return {
    processId,
    retrievalText,
    chunks: normalizedChunks,
  };
}

export const completeBinaryEmbeddingProcessHttp = httpAction(
  async (ctx, request) => {
    if (!isAuthorized(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      const payload = readCompletionPayload(await request.json());
      const result = await ctx.runAction(
        internal.context.binaryEmbeddings.completeBinaryEmbeddingProcess,
        payload as never,
      );
      return Response.json(result, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to complete binary embedding process",
        },
        { status: 400 },
      );
    }
  },
);

export const failBinaryEmbeddingProcessHttp = httpAction(async (ctx, request) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const payload = await request.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("processId" in payload) ||
      typeof payload.processId !== "string"
    ) {
      throw new Error("Missing processId");
    }
    await ctx.runAction(internal.context.binaryEmbeddings.failBinaryEmbeddingProcess, {
      processId: payload.processId,
      error: readErrorMessage(payload),
    } as never);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record binary embedding failure",
      },
      { status: 400 },
    );
  }
});
