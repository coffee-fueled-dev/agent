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
  type AttachedFileEmbeddingState,
  AttachedFileEmbedRow,
  useFiles,
} from "@/components/files";

export function fileKeyFor(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

type ChatComposerFileContextValue = {
  fileEmbedStates: Record<string, AttachedFileEmbeddingState>;
  reportEmbedState: (
    fileKey: string,
    state: AttachedFileEmbeddingState,
  ) => void;
  allAttachmentsEmbedded: boolean;
  /** Same order as `files`; undefined if any embedding missing. */
  getOrderedFileEmbeddings: (files: File[]) => number[][] | undefined;
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
    Record<string, AttachedFileEmbeddingState>
  >({});

  const reportEmbedState = useCallback(
    (fileKey: string, state: AttachedFileEmbeddingState) => {
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
        s.embedding !== null &&
        s.embedding.length > 0
      );
    });
  }, [files, fileEmbedStates]);

  const getOrderedFileEmbeddings = useCallback(
    (orderFiles: File[]) => {
      if (orderFiles.length === 0) return undefined;
      const out: number[][] = [];
      for (const f of orderFiles) {
        const emb = fileEmbedStates[fileKeyFor(f)]?.embedding;
        if (!emb?.length) return undefined;
        out.push(emb);
      }
      return out;
    },
    [fileEmbedStates],
  );

  const value = useMemo(
    (): ChatComposerFileContextValue => ({
      fileEmbedStates,
      reportEmbedState,
      allAttachmentsEmbedded,
      getOrderedFileEmbeddings,
    }),
    [
      fileEmbedStates,
      reportEmbedState,
      allAttachmentsEmbedded,
      getOrderedFileEmbeddings,
    ],
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
}: {
  fileKey: string;
  file: File;
}) {
  const { reportEmbedState } = useChatComposerFile();
  const { removeFile } = useFiles();

  const report = useCallback(
    (state: AttachedFileEmbeddingState) => {
      reportEmbedState(fileKey, state);
    },
    [fileKey, reportEmbedState],
  );

  const handleRemove = useCallback(() => {
    removeFile(file.name);
  }, [file.name, removeFile]);

  return (
    <AttachedFileEmbedRow
      file={file}
      onRemove={handleRemove}
      onEmbeddingStateChange={report}
    />
  );
}
