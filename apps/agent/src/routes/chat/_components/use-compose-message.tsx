"use client";

import { api } from "@very-coffee/backend/api";
import { useSessionMutation } from "convex-helpers/react/sessions";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { optimisticallySendChatMessage } from "../_hooks/optimistically-send-chat-message.js";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import { useChatComposerAttachments } from "./chat-composer-attachments-provider.js";
import {
  shareMemoriesSelectedCountFromSendArgs,
  useChatComposerMemory,
} from "./chat-composer-memory-provider.js";

export type ComposeMessageContextValue = {
  text: string;
  setText: (text: string) => void;
  send: () => Promise<void>;
  sendDisabled: boolean;
  sending: boolean;
  error: string | null;
};

const ComposeMessageContext = createContext<ComposeMessageContextValue | null>(
  null,
);

export function useComposeMessage(): ComposeMessageContextValue {
  const ctx = useContext(ComposeMessageContext);
  if (!ctx) {
    throw new Error(
      "useComposeMessage must be used within ComposeMessageProvider",
    );
  }
  return ctx;
}

export function ComposeMessageProvider({ children }: { children: ReactNode }) {
  const { threadId, userId, createThread, setAwaitingAssistantStream } =
    useChatThread();
  const {
    files,
    allAttachmentsReady,
    readyAttachmentPayloads,
    clearAttachments,
  } = useChatComposerAttachments();
  const { memoryRecordIds, shareMemoriesToolCalls, clearMemoryRecordIds } =
    useChatComposerMemory();

  const sendMessage = useSessionMutation(
    api.chat.thread.sendMessage,
  ).withOptimisticUpdate((store, args) => {
    const selectedCount = shareMemoriesSelectedCountFromSendArgs(args);
    optimisticallySendChatMessage(api.chat.thread.listThreadMessages)(store, {
      threadId: args.threadId,
      prompt: args.prompt,
      selectedMemoryCount: selectedCount,
    });
  });

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (
      (!trimmed &&
        files.length === 0 &&
        memoryRecordIds.length === 0) ||
      sending
    ) {
      return;
    }
    if (files.length > 0 && !allAttachmentsReady) return;
    if (!userId) return;
    setSending(true);
    setError(null);
    try {
      const activeThreadId =
        threadId ?? (await createThread({ title: "Chat" }));

      await sendMessage({
        threadId: activeThreadId,
        userId,
        namespace: userId,
        prompt: trimmed,
        attachments: readyAttachmentPayloads,
        ...(shareMemoriesToolCalls
          ? { toolCalls: shareMemoriesToolCalls }
          : {}),
      });
      setAwaitingAssistantStream(true);
      setText("");
      clearAttachments();
      clearMemoryRecordIds();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [
    text,
    files.length,
    memoryRecordIds.length,
    sending,
    allAttachmentsReady,
    userId,
    threadId,
    createThread,
    sendMessage,
    readyAttachmentPayloads,
    shareMemoriesToolCalls,
    clearAttachments,
    clearMemoryRecordIds,
    setAwaitingAssistantStream,
  ]);

  const sendDisabled =
    sending ||
    (!text.trim() &&
      files.length === 0 &&
      memoryRecordIds.length === 0) ||
    !userId ||
    (files.length > 0 && !allAttachmentsReady);

  const value = useMemo(
    (): ComposeMessageContextValue => ({
      text,
      setText,
      send,
      sendDisabled,
      sending,
      error,
    }),
    [text, send, sendDisabled, sending, error],
  );

  return (
    <ComposeMessageContext.Provider value={value}>
      {children}
    </ComposeMessageContext.Provider>
  );
}
