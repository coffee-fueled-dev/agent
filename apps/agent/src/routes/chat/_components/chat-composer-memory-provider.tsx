"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ChatComposerMemoryContextValue = {
  memoryRecordIds: readonly string[];
  toggleMemoryRecordId: (id: string) => void;
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
  const [memoryRecordIds, setMemoryRecordIds] = useState<string[]>([]);
  const [memorySearchOpen, setMemorySearchOpen] = useState(false);

  const toggleMemoryRecordId = useCallback((id: string) => {
    setMemoryRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const removeMemoryRecordId = useCallback((id: string) => {
    setMemoryRecordIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearMemoryRecordIds = useCallback(() => {
    setMemoryRecordIds([]);
  }, []);

  const value = useMemo(
    (): ChatComposerMemoryContextValue => ({
      memoryRecordIds,
      toggleMemoryRecordId,
      removeMemoryRecordId,
      clearMemoryRecordIds,
      memorySearchOpen,
      setMemorySearchOpen,
    }),
    [
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
