import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { api } from "@very-coffee/backend/api";
import type { Id } from "@very-coffee/backend/dataModel";
import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";
import { buildContextFileKey } from "./context-file.js";

export type PreparedAttachment = {
  storageId: Id<"_storage">;
  contentHash: string;
  mimeType: string;
  fileName: string;
  key: string;
};

export function useContextFileUpload() {
  const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
  const processFile = useAction(api.files.processFile);

  const uploadFileToStorage = useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
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

  const prepareAttachment = useCallback(
    async (file: File): Promise<PreparedAttachment> => {
      const [storageId, contentHash] = await Promise.all([
        uploadFileToStorage(file),
        contentHashFromArrayBuffer(await file.arrayBuffer()),
      ]);
      return {
        storageId,
        contentHash,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        key: buildContextFileKey({
          fileName: file.name,
          prefix: "chat",
          fallback: "file",
        }),
      };
    },
    [uploadFileToStorage],
  );

  const startFileProcessing = useCallback(
    async (args: {
      userId: string;
      namespace: string;
      key: string;
      title?: string;
      storageId: Id<"_storage">;
      mimeType: string;
      fileName?: string;
      contentHash?: string;
    }) => {
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
    prepareAttachment,
    startFileProcessing,
  };
}
