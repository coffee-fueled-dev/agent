import { api } from "@backend/api.js";
import type { Id } from "@backend/dataModel.js";
import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import {
  useSessionAction,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { useCallback } from "react";
import { isTextLikeFile, readFileText } from "./context-file.js";

export type PreparedAttachment = {
  storageId: Id<"_storage">;
  contentHash: string;
  mimeType: string;
  fileName: string;
  text?: string;
};

export function useContextFileUpload() {
  const generateUploadUrl = useSessionMutation(
    api.context.files.generateContextUploadUrl,
  );
  const addFileContext = useSessionAction(api.context.files.addFileContext);

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
      const fileText = isTextLikeFile(file)
        ? await readFileText(file)
        : undefined;
      return {
        storageId,
        contentHash,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        text: fileText,
      };
    },
    [uploadFileToStorage],
  );

  const indexFileInContext = useCallback(
    async (args: {
      namespace: string;
      key: string;
      title?: string;
      storageId: string;
      mimeType: string;
      fileName?: string;
      text?: string;
      contentHash?: string;
    }) => {
      await addFileContext({
        namespace: args.namespace,
        key: args.key,
        title: args.title,
        storageId: args.storageId as never,
        mimeType: args.mimeType,
        fileName: args.fileName,
        text: args.text,
        contentHash: args.contentHash,
      });
    },
    [addFileContext],
  );

  return {
    uploadFileToStorage,
    prepareAttachment,
    indexFileInContext,
  };
}
