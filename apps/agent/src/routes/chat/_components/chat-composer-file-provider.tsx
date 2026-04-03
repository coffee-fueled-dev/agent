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
  type FileMemoryEmbeddingState,
  FileEmbeddingRow,
  useFiles,
} from "@/files";

export function fileKeyFor(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

type ChatComposerFileContextValue = {
  fileEmbedStates: Record<string, FileMemoryEmbeddingState>;
  reportEmbedState: (
    fileKey: string,
    state: FileMemoryEmbeddingState,
  ) => void;
  allAttachmentsReady: boolean;
};

const ChatComposerFileContext =
  createContext<ChatComposerFileContextValue | null>(null);

export function useChatComposerFile() {
  const ctx = useContext(ChatComposerFileContext);
  if (!ctx) {
    throw new Error(
      "useChatComposerFile must be used within ChatComposerFileProvider",
    );
  }
  return ctx;
}

export function ChatComposerFileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { files } = useFiles();
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

  const value = useMemo(
    (): ChatComposerFileContextValue => ({
      fileEmbedStates,
      reportEmbedState,
      allAttachmentsReady: allAttachmentsEmbedded,
    }),
    [fileEmbedStates, reportEmbedState, allAttachmentsEmbedded],
  );

  return (
    <ChatComposerFileContext.Provider value={value}>
      {children}
    </ChatComposerFileContext.Provider>
  );
}

/**
 * File row for chat: reports embeddings into {@link ChatComposerFileProvider} and removes via `useFiles`.
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
  const { reportEmbedState } = useChatComposerFile();
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
