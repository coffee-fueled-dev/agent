import { api } from "@agent/backend/api";
import type { Id } from "@agent/backend/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useConvexFileUpload } from "./use-convex-file-upload.js";

export type FileMemoryEmbeddingState = {
  contentHash: string | null;
  storageId: Id<"_storage"> | null;
  processId: Id<"fileProcesses"> | null;
  memoryId: string | null;
  embeddingPending: boolean;
  fileContentResolved: boolean;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  error: string | null;
};

/**
 * Uploads a file, starts {@link api.files.processFile}, and polls {@link api.files.getFileProcess}
 * until the memory record is ready for search.
 */
export function useFileMemoryEmbedding(file: File, namespace: string) {
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [processId, setProcessId] = useState<Id<"fileProcesses"> | null>(null);
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [embeddingPending, setEmbeddingPending] = useState(false);
  const [fileContentResolved, setFileContentResolved] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const { prepareFile, submitForEmbedding } = useConvexFileUpload();
  const process = useQuery(
    api.files.store.getFileProcess,
    processId ? { processId } : "skip",
  );

  useEffect(() => {
    const abort = new AbortController();
    setContentHash(null);
    setStorageId(null);
    setProcessId(null);
    setMemoryId(null);
    setEmbeddingPending(false);
    setFileContentResolved(false);
    setStatus("idle");
    setError(null);

    void (async () => {
      try {
        setStatus("uploading");
        setEmbeddingPending(true);
        const prepared = await prepareFile(file, abort.signal);
        if (abort.signal.aborted) return;
        setContentHash(prepared.contentHash);
        setStorageId(prepared.storageId);
        setFileContentResolved(true);

        const processResult = await submitForEmbedding(
          {
            namespace,
            key: prepared.key,
            title: prepared.fileName,
            storageId: prepared.storageId,
            mimeType: prepared.mimeType,
            fileName: prepared.fileName,
            contentHash: prepared.contentHash,
          },
          abort.signal,
        );
        if (abort.signal.aborted) return;
        setProcessId(processResult.processId);
        setMemoryId(processResult.memoryId);
        if (processResult.status === "completed") {
          setEmbeddingPending(false);
          setStatus("completed");
        } else if (processResult.status === "failed") {
          setEmbeddingPending(false);
          setStatus("failed");
        } else {
          setStatus("processing");
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        if (!abort.signal.aborted) {
          setEmbeddingPending(false);
          setStatus("failed");
          setError(
            cause instanceof Error ? cause.message : "Processing failed",
          );
          setFileContentResolved(false);
        }
      }
    })();

    return () => {
      abort.abort();
    };
  }, [file, prepareFile, submitForEmbedding, namespace]);

  useEffect(() => {
    if (!processId || !process) return;
    if (process.status === "completed" && process.memoryId) {
      setMemoryId(process.memoryId);
      setEmbeddingPending(false);
      setStatus("completed");
      setError(null);
    } else if (process.status === "failed") {
      setEmbeddingPending(false);
      setStatus("failed");
      setError(process.error ?? "Processing failed");
    } else {
      setEmbeddingPending(true);
      setStatus(process.status === "pending" ? "uploading" : "processing");
    }
  }, [process, processId]);

  return {
    contentHash,
    storageId,
    processId,
    memoryId,
    embeddingPending,
    fileContentResolved,
    status,
    error,
  };
}
