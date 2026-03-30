import { api } from "@backend/api.js";
import type { ConvexReactClient } from "convex/react";
import {
  useSessionAction,
  useSessionMutation,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useCallback, useEffect, useRef, useState } from "react";
import { isTextLikeMimeType } from "./context-file.js";
import type { PreparedAttachment } from "./use-context-file-upload.js";

const POLL_MS = 400;
const MAX_POLLS = 150;

/**
 * Single-file Context Search: upload + embed-for-search when cache miss, subscribe to cache.
 */
export function useEmbedForSearchAttachedFile(options: {
  file: File | null;
  contentHash: string | null;
  fileTextForLexical: string | null;
}) {
  const { file, contentHash, fileTextForLexical } = options;
  const embedForSearch = useSessionAction(api.context.search.embedForSearch);
  const generateUploadUrl = useSessionMutation(
    api.context.files.generateContextUploadUrl,
  );
  const cachedEntry = useSessionQuery(
    api.context.embeddingCacheStore.getByHash,
    contentHash ? { contentHash } : "skip",
  );
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [embeddingPending, setEmbeddingPending] = useState(false);
  const dispatchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (cachedEntry?.embedding) {
      setEmbedding(cachedEntry.embedding);
      setEmbeddingPending(false);
    }
  }, [cachedEntry]);

  useEffect(() => {
    if (
      contentHash &&
      file &&
      cachedEntry === null &&
      dispatchedRef.current !== contentHash
    ) {
      dispatchedRef.current = contentHash;
      setEmbeddingPending(true);
      void (async () => {
        try {
          const uploadUrl = await generateUploadUrl({});
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
          if (!res.ok) throw new Error("Upload failed");
          const { storageId } = (await res.json()) as { storageId: string };
          await embedForSearch({
            storageId,
            mimeType: file.type || "application/octet-stream",
            contentHash,
            text: fileTextForLexical ?? undefined,
          });
        } catch (err) {
          console.error("Failed to dispatch embed job", err);
          setEmbeddingPending(false);
        }
      })();
    }
  }, [
    contentHash,
    file,
    cachedEntry,
    generateUploadUrl,
    embedForSearch,
    fileTextForLexical,
  ]);

  const resetEmbeddingState = useCallback(() => {
    setEmbedding(null);
    setEmbeddingPending(false);
    dispatchedRef.current = null;
  }, []);

  return { embedding, embeddingPending, resetEmbeddingState };
}

/**
 * After `embedForSearch` for each prepared file: text-like paths fill cache synchronously;
 * binary paths need polling until the embedding server reports completion.
 */
export async function ensureEmbeddingsReady(
  convex: ConvexReactClient,
  sessionId: SessionId,
  embedForSearch: (args: {
    storageId: string;
    mimeType: string;
    contentHash: string;
    text?: string;
  }) => Promise<unknown>,
  prepared: PreparedAttachment[],
): Promise<void> {
  await Promise.all(
    prepared.map((p) =>
      embedForSearch({
        storageId: p.storageId,
        mimeType: p.mimeType,
        contentHash: p.contentHash,
        text: p.text,
      }),
    ),
  );
  for (const p of prepared) {
    if (isTextLikeMimeType(p.mimeType)) continue;
    let found = false;
    for (let i = 0; i < MAX_POLLS; i++) {
      const row = await convex.query(
        api.context.embeddingCacheStore.getByHash,
        {
          sessionId,
          contentHash: p.contentHash,
        },
      );
      if (row?.embedding) {
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (!found) {
      throw new Error(
        `Timed out waiting for search embedding (${p.fileName}). Is the embedding server running?`,
      );
    }
  }
}

export async function collectEmbeddingsFromCache(
  convex: ConvexReactClient,
  sessionId: SessionId,
  prepared: PreparedAttachment[],
): Promise<number[][]> {
  if (!prepared.length) return [];
  const rows = await convex.query(api.context.embeddingCacheStore.getByHashes, {
    sessionId,
    contentHashes: prepared.map((p) => p.contentHash),
  });
  const out: number[][] = [];
  for (let i = 0; i < prepared.length; i++) {
    const emb = rows[i]?.embedding;
    if (!emb?.length) {
      throw new Error(
        `Missing embedding for search (file: ${prepared[i]?.fileName})`,
      );
    }
    out.push(emb);
  }
  return out;
}
