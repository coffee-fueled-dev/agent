"use client";

import {
  buildHumanToolCall,
  type HumanToolkitToolInputs,
} from "@very-coffee/backend/types";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHumanToolkit } from "./human-toolkit-provider.js";

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

/** Convex `sendMessage` args → selected memory count for optimistic UI. */
export function shareMemoriesSelectedCountFromSendArgs(args: {
  toolCalls?: { name: string; input: unknown }[];
}): number {
  const share = args.toolCalls?.find((c) => c.name === "shareMemories");
  if (!share || typeof share.input !== "object" || share.input === null) {
    return 0;
  }
  const ids = (share.input as { selectedMemoryRecordIds?: string[] })
    .selectedMemoryRecordIds;
  return ids?.length ?? 0;
}

type ChatComposerMemoryContextValue = {
  memoryEntries: readonly ComposerMemoryEntry[];
  /** Stable id list for mutations and optimistic updates. */
  memoryRecordIds: readonly string[];
  /** All memory record ids returned as search hits this composer turn (for shareMemories tool input). */
  seenMemoryRecordIds: readonly string[];
  registerSeenMemoryIds: (ids: readonly string[]) => void;
  toggleMemoryRecordId: (id: string, meta?: MemoryAttachmentMeta) => void;
  removeMemoryRecordId: (id: string) => void;
  clearMemoryRecordIds: () => void;
  memorySearchOpen: boolean;
  setMemorySearchOpen: (open: boolean) => void;
  shareMemoriesAllowed: boolean;
  selectedShareMemoryCount: number;
  shareMemoriesToolCalls:
    | Array<{
        name: "shareMemories";
        input: HumanToolkitToolInputs["shareMemories"];
      }>
    | undefined;
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
  const humanToolkit = useHumanToolkit();
  const [memoryEntries, setMemoryEntries] = useState<ComposerMemoryEntry[]>(
    [],
  );
  const [memorySearchOpen, setMemorySearchOpen] = useState(false);
  const [seenMemoryRecordIds, setSeenMemoryRecordIds] = useState<string[]>([]);

  const memoryRecordIds = useMemo(
    () => memoryEntries.map((e) => e.id),
    [memoryEntries],
  );

  const shareMemoriesAllowed =
    humanToolkit?.isAllowed("shareMemories") ?? false;

  const selectedShareMemoryCount = memoryRecordIds.length;

  const shareMemoriesToolCalls = useMemo(() => {
    if (memoryRecordIds.length === 0) {
      return undefined;
    }
    return [
      buildHumanToolCall("shareMemories", {
        seenMemoryRecordIds: [...seenMemoryRecordIds],
        selectedMemoryRecordIds: [...memoryRecordIds],
      }),
    ];
  }, [seenMemoryRecordIds, memoryRecordIds]);

  useEffect(() => {
    if (!shareMemoriesAllowed && memorySearchOpen) {
      setMemorySearchOpen(false);
    }
  }, [memorySearchOpen, shareMemoriesAllowed]);

  const registerSeenMemoryIds = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    setSeenMemoryRecordIds((prev) => [...new Set([...prev, ...ids])]);
  }, []);

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
    setSeenMemoryRecordIds([]);
  }, []);

  const value = useMemo(
    (): ChatComposerMemoryContextValue => ({
      memoryEntries,
      memoryRecordIds,
      seenMemoryRecordIds,
      registerSeenMemoryIds,
      toggleMemoryRecordId,
      removeMemoryRecordId,
      clearMemoryRecordIds,
      memorySearchOpen,
      setMemorySearchOpen,
      shareMemoriesAllowed,
      selectedShareMemoryCount,
      shareMemoriesToolCalls,
    }),
    [
      memoryEntries,
      memoryRecordIds,
      seenMemoryRecordIds,
      registerSeenMemoryIds,
      toggleMemoryRecordId,
      removeMemoryRecordId,
      clearMemoryRecordIds,
      memorySearchOpen,
      shareMemoriesAllowed,
      selectedShareMemoryCount,
      shareMemoriesToolCalls,
    ],
  );

  return (
    <ChatComposerMemoryContext.Provider value={value}>
      {children}
    </ChatComposerMemoryContext.Provider>
  );
}
