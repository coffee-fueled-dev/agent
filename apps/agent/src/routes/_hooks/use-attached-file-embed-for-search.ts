import { api } from "@very-coffee/backend/api";
import type { Id } from "@very-coffee/backend/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useContextFileUpload } from "./use-context-file-upload.js";

export type AttachedFileEmbeddingState = {
  contentHash: string | null;
  storageId: Id<"_storage"> | null;
  processId: Id<"fileProcesses"> | null;
  memoryId: string | null;
  embeddingPending: boolean;
  fileContentResolved: boolean;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  error: string | null;
};

export function useAttachedFileEmbedForSearch(file: File, userId: string) {
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
  const { prepareAttachment, startFileProcessing } = useContextFileUpload();
  const process = useQuery(
    api.files.getFileProcess,
    processId ? { processId } : "skip",
  );

  useEffect(() => {
    let cancelled = false;
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
        const prepared = await prepareAttachment(file);
        if (cancelled) return;
        setContentHash(prepared.contentHash);
        setStorageId(prepared.storageId);
        setFileContentResolved(true);

        const processResult = await startFileProcessing({
          userId,
          namespace: userId,
          key: prepared.key,
          title: prepared.fileName,
          storageId: prepared.storageId,
          mimeType: prepared.mimeType,
          fileName: prepared.fileName,
          contentHash: prepared.contentHash,
        });
        if (cancelled) return;
        setProcessId(processResult.processId);
        if (processResult.status === "completed") {
          setMemoryId(processResult.memoryId);
          setEmbeddingPending(false);
          setStatus("completed");
        } else {
          setStatus("processing");
        }
      } catch (cause) {
        if (!cancelled) {
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
      cancelled = true;
    };
  }, [file, prepareAttachment, startFileProcessing, userId]);

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
