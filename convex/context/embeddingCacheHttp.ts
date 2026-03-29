import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { getFileEmbeddingSecret } from "../env";

export const embeddingCacheCompletePath = "/embedding-cache/complete";
export const embeddingCacheFailPath = "/embedding-cache/fail";

function getSecret() {
  return getFileEmbeddingSecret();
}

function isAuthorized(request: Request) {
  return request.headers.get("x-binary-embedding-secret") === getSecret();
}

export const completeEmbeddingCacheHttp = httpAction(async (ctx, request) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { contentHash, embedding, mimeType } = payload;
    if (
      typeof contentHash !== "string" ||
      !Array.isArray(embedding) ||
      typeof mimeType !== "string"
    ) {
      throw new Error(
        "Missing required fields: contentHash, embedding, mimeType",
      );
    }
    await ctx.runMutation(internal.context.embeddingCacheStore.cacheEmbedding, {
      contentHash,
      embedding: embedding as number[],
      mimeType,
    });
    return Response.json({ cached: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cache write failed" },
      { status: 400 },
    );
  }
});

export const failEmbeddingCacheHttp = httpAction(async (_ctx, request) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Nothing to clean up for cache misses; just acknowledge
  return new Response(null, { status: 204 });
});
