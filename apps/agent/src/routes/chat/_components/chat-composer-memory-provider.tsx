"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ComposerMemoryEntry = {
  id: string;
  title?: string | null;
  fileName?: string | null;
};

/** Label for composer chips: title → file name → record id. */
export function memoryBadgeLabel(e: ComposerMemoryEntry): string {
  const t = e.title?.trim();
  if (t) return t;
  const f = e.fileName?.trim();
  if (f) return f;
  return e.id;
}

type MemoryAttachmentMeta = {
  title?: string | null;
  fileName?: string | null;
};

type ChatComposerMemoryContextValue = {
  memoryEntries: readonly ComposerMemoryEntry[];
  /** Stable id list for mutations and optimistic updates. */
  memoryRecordIds: readonly string[];
  toggleMemoryRecordId: (id: string, meta?: MemoryAttachmentMeta) => void;
  removeMemoryRecordId: (id: string) => void;
  clearMemoryRecordIds: () => void;
  memorySearchOpen: boolean;
  setMemorySearchOpen: (open: boolean) => void;
};

const ChatComposerMemoryContext =
  createContext<ChatComposerMemoryContextValue | null>(null);

export function useChatComposerMemory() {
  const ctx = useContext(ChatComposerMemoryContext);
  if (!ctx) {
    throw new Error(
      "useChatComposerMemory must be used within ChatComposerMemoryProvider",
    );
  }
  return ctx;
}

export function ChatComposerMemoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [memoryEntries, setMemoryEntries] = useState<ComposerMemoryEntry[]>(
    [],
  );
  const [memorySearchOpen, setMemorySearchOpen] = useState(false);

  const memoryRecordIds = useMemo(
    () => memoryEntries.map((e) => e.id),
    [memoryEntries],
  );

  const toggleMemoryRecordId = useCallback(
    (id: string, meta?: MemoryAttachmentMeta) => {
      setMemoryEntries((prev) => {
        const exists = prev.some((e) => e.id === id);
        if (exists) return prev.filter((e) => e.id !== id);
        return [
          ...prev,
          {
            id,
            title: meta?.title ?? null,
            fileName: meta?.fileName ?? null,
          },
        ];
      });
    },
    [],
  );

  const removeMemoryRecordId = useCallback((id: string) => {
    setMemoryEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearMemoryRecordIds = useCallback(() => {
    setMemoryEntries([]);
  }, []);

  const value = useMemo(
    (): ChatComposerMemoryContextValue => ({
      memoryEntries,
      memoryRecordIds,
      toggleMemoryRecordId,
      removeMemoryRecordId,
      clearMemoryRecordIds,
      memorySearchOpen,
      setMemorySearchOpen,
    }),
    [
      memoryEntries,
      memoryRecordIds,
      toggleMemoryRecordId,
      removeMemoryRecordId,
      clearMemoryRecordIds,
      memorySearchOpen,
    ],
  );

  return (
    <ChatComposerMemoryContext.Provider value={value}>
      {children}
    </ChatComposerMemoryContext.Provider>
  );
}
