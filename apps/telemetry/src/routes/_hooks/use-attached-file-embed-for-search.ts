import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { useEffect, useState } from "react";
import { isTextLikeFile, readFileText } from "./context-file.js";
import { useEmbedForSearchAttachedFile } from "./embed-for-search.js";

export type AttachedFileEmbeddingState = {
  contentHash: string | null;
  fileTextForLexical: string | null;
  embedding: number[] | null;
  embeddingPending: boolean;
  /** Hash + optional lexical text read finished; embed-for-search may still be running. */
  fileContentResolved: boolean;
};

/**
 * Computes content hash + optional lexical text for a file, then runs embed-for-search cache/upload flow.
 * Intended for use inside a single-file row component.
 */
export function useAttachedFileEmbedForSearch(file: File) {
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [fileTextForLexical, setFileTextForLexical] = useState<string | null>(
    null,
  );
  const [fileContentResolved, setFileContentResolved] = useState(false);

  const { embedding, embeddingPending, resetEmbeddingState } =
    useEmbedForSearchAttachedFile({
      file,
      contentHash,
      fileTextForLexical,
    });

  useEffect(() => {
    let cancelled = false;
    resetEmbeddingState();
    setContentHash(null);
    setFileTextForLexical(null);
    setFileContentResolved(false);

    void (async () => {
      try {
        const buffer = await file.arrayBuffer();
        if (cancelled) return;
        const hash = await contentHashFromArrayBuffer(buffer);
        if (cancelled) return;
        setContentHash(hash);

        let lexicalText: string | null = null;
        if (isTextLikeFile(file)) {
          try {
            lexicalText = await readFileText(file);
          } catch {
            lexicalText = null;
          }
        }
        if (cancelled) return;
        setFileTextForLexical(lexicalText);
        if (!cancelled) setFileContentResolved(true);
      } catch {
        if (!cancelled) setFileContentResolved(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, resetEmbeddingState]);

  return {
    contentHash,
    fileTextForLexical,
    embedding,
    embeddingPending,
    fileContentResolved,
  };
}
