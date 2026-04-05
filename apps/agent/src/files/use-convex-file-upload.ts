import { api } from "@agent/backend/api";
import type { Id } from "@agent/backend/dataModel";
import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";
import { buildFileMemoryKey } from "./file-keys.js";

export type PreparedConvexFile = {
  storageId: Id<"_storage">;
  contentHash: string;
  mimeType: string;
  fileName: string;
  key: string;
};

/**
 * Uploads to Convex file storage and calls {@link api.files.processFile} for embedding + memory indexing.
 */
export function useConvexFileUpload() {
  const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
  const processFile = useAction(api.files.processFile);

  const uploadFileToStorage = useCallback(
    async (file: File, signal?: AbortSignal): Promise<Id<"_storage">> => {
      const uploadUrl = await generateUploadUrl({});
      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
        signal,
      });
      if (!response.ok) throw new Error("Failed to upload file.");
      const payload = (await response.json()) as { storageId?: string };
      if (!payload.storageId) {
        throw new Error("Upload did not return a storage id.");
      }
      return payload.storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );

  const prepareFile = useCallback(
    async (file: File, signal?: AbortSignal): Promise<PreparedConvexFile> => {
      const [storageId, contentHash] = await Promise.all([
        uploadFileToStorage(file, signal),
        contentHashFromArrayBuffer(await file.arrayBuffer()),
      ]);
      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }
      return {
        storageId,
        contentHash,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        key: buildFileMemoryKey({
          fileName: file.name,
          prefix: "chat",
          fallback: "file",
        }),
      };
    },
    [uploadFileToStorage],
  );

  const submitForEmbedding = useCallback(
    async (
      args: {
        namespace: string;
        key: string;
        title?: string;
        storageId: Id<"_storage">;
        mimeType: string;
        fileName?: string;
        contentHash?: string;
      },
      signal?: AbortSignal,
    ) => {
      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }
      return await processFile({
        namespace: args.namespace,
        key: args.key,
        title: args.title,
        storageId: args.storageId,
        mimeType: args.mimeType,
        fileName: args.fileName,
        contentHash: args.contentHash,
      });
    },
    [processFile],
  );

  return {
    uploadFileToStorage,
    prepareFile,
    submitForEmbedding,
  };
}
