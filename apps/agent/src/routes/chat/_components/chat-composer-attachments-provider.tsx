"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FileEmbeddingRow,
  type FileMemoryEmbeddingState,
  useFiles,
} from "@/files";

export function fileKeyFor(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

/** Convex `sendMessage` attachment shape. */
export type ChatComposerAttachmentPayload = {
  storageId: string;
  fileName: string;
  mimeType: string;
  contentHash: string;
};

type ChatComposerAttachmentsContextValue = {
  files: readonly File[];
  addFiles: (files: File[]) => void;
  fileEmbedStates: Record<string, FileMemoryEmbeddingState>;
  reportEmbedState: (fileKey: string, state: FileMemoryEmbeddingState) => void;
  allAttachmentsReady: boolean;
  /** Ready for `sendMessage.attachments`; `undefined` when no files or still embedding. */
  readyAttachmentPayloads: ChatComposerAttachmentPayload[] | undefined;
  clearAttachments: () => void;
};

const ChatComposerAttachmentsContext =
  createContext<ChatComposerAttachmentsContextValue | null>(null);

export function useChatComposerAttachments() {
  const ctx = useContext(ChatComposerAttachmentsContext);
  if (!ctx) {
    throw new Error(
      "useChatComposerAttachments must be used within ChatComposerAttachmentsProvider",
    );
  }
  return ctx;
}

export function ChatComposerAttachmentsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { files, addFiles, clearFiles } = useFiles();
  const [fileEmbedStates, setFileEmbedStates] = useState<
    Record<string, FileMemoryEmbeddingState>
  >({});

  const reportEmbedState = useCallback(
    (fileKey: string, state: FileMemoryEmbeddingState) => {
      setFileEmbedStates((prev) => ({ ...prev, [fileKey]: state }));
    },
    [],
  );

  useEffect(() => {
    const keys = new Set(files.map(fileKeyFor));
    setFileEmbedStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!keys.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [files]);

  const allAttachmentsEmbedded = useMemo(() => {
    if (files.length === 0) return true;
    return files.every((f) => {
      const s = fileEmbedStates[fileKeyFor(f)];
      return (
        s?.fileContentResolved &&
        !s.embeddingPending &&
        s.storageId !== null &&
        s.contentHash !== null &&
        s.memoryId !== null &&
        s.status === "completed"
      );
    });
  }, [files, fileEmbedStates]);

  const readyAttachmentPayloads = useMemo(():
    | ChatComposerAttachmentPayload[]
    | undefined => {
    if (files.length === 0) return undefined;
    if (!allAttachmentsEmbedded) return undefined;
    const out: ChatComposerAttachmentPayload[] = [];
    for (const file of files) {
      const state = fileEmbedStates[fileKeyFor(file)];
      if (
        !state ||
        state.status !== "completed" ||
        !state.storageId ||
        !state.contentHash
      ) {
        return undefined;
      }
      out.push({
        storageId: state.storageId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentHash: state.contentHash,
      });
    }
    return out;
  }, [files, allAttachmentsEmbedded, fileEmbedStates]);

  const clearAttachments = useCallback(() => {
    clearFiles();
  }, [clearFiles]);

  const value = useMemo(
    (): ChatComposerAttachmentsContextValue => ({
      files,
      addFiles,
      fileEmbedStates,
      reportEmbedState,
      allAttachmentsReady: allAttachmentsEmbedded,
      readyAttachmentPayloads,
      clearAttachments,
    }),
    [
      files,
      addFiles,
      fileEmbedStates,
      reportEmbedState,
      allAttachmentsEmbedded,
      readyAttachmentPayloads,
      clearAttachments,
    ],
  );

  return (
    <ChatComposerAttachmentsContext.Provider value={value}>
      {children}
    </ChatComposerAttachmentsContext.Provider>
  );
}

/**
 * File row for chat: reports embeddings into {@link ChatComposerAttachmentsProvider}.
 */
export function ChatComposerFileRow({
  fileKey,
  file,
  userId,
}: {
  fileKey: string;
  file: File;
  userId: string;
}) {
  const { reportEmbedState } = useChatComposerAttachments();
  const { removeFile } = useFiles();

  const report = useCallback(
    (state: FileMemoryEmbeddingState) => {
      reportEmbedState(fileKey, state);
    },
    [fileKey, reportEmbedState],
  );

  const handleRemove = useCallback(() => {
    removeFile(file.name);
  }, [file.name, removeFile]);

  return (
    <FileEmbeddingRow
      file={file}
      namespace={userId}
      onRemove={handleRemove}
      onEmbeddingStateChange={report}
    />
  );
}
