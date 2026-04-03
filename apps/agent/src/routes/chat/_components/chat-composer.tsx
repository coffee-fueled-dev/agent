import { api } from "@very-coffee/backend/api";
import { useMutation } from "convex/react";
import { PaperclipIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { FileDropzone, useFiles } from "@/files";
import { optimisticallySendChatMessage } from "../_hooks/optimistically-send-chat-message.js";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import {
  memoryBadgeLabel,
  useChatComposerMemory,
} from "./chat-composer-memory-provider.js";
import {
  ChatComposerFileProvider,
  ChatComposerFileRow,
  fileKeyFor,
  useChatComposerFile,
} from "./chat-composer-file-provider.js";
import { MemorySearchModal } from "./memory-search-modal.js";

function ChatComposerInner() {
  const { threadId, userId, createThread, setAwaitingAssistantStream } =
    useChatThread();
  const sendMessage = useMutation(
    api.chat.thread.sendMessage,
  ).withOptimisticUpdate((store, args) => {
    optimisticallySendChatMessage(api.chat.thread.listThreadMessages)(store, {
      threadId: args.threadId,
      prompt: args.prompt,
      memoryRecordIds: args.memoryRecordIds,
    });
  });
  const { files, addFiles, clearFiles } = useFiles();
  const { allAttachmentsReady, fileEmbedStates } = useChatComposerFile();
  const {
    memoryEntries,
    memoryRecordIds,
    removeMemoryRecordId,
    clearMemoryRecordIds,
    memorySearchOpen,
    setMemorySearchOpen,
  } = useChatComposerMemory();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (
      (!trimmed && files.length === 0 && memoryRecordIds.length === 0) ||
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

      const attachments =
        files.length > 0
          ? files.map((file) => {
              const state = fileEmbedStates[fileKeyFor(file)];
              if (
                !state ||
                state.status !== "completed" ||
                !state.storageId ||
                !state.contentHash
              ) {
                throw new Error(`File is not ready yet: ${file.name}`);
              }
              return {
                storageId: state.storageId,
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                contentHash: state.contentHash,
              };
            })
          : undefined;

      await sendMessage({
        threadId: activeThreadId,
        userId,
        namespace: userId,
        prompt: trimmed,
        sessionId: activeThreadId,
        attachments,
        memoryRecordIds:
          memoryRecordIds.length > 0 ? [...memoryRecordIds] : undefined,
      });
      setAwaitingAssistantStream(true);
      setText("");
      clearFiles();
      clearMemoryRecordIds();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const sendDisabled =
    sending ||
    (!text.trim() && files.length === 0 && memoryRecordIds.length === 0) ||
    !userId ||
    (files.length > 0 && !allAttachmentsReady);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      {userId ? (
        <MemorySearchModal
          open={memorySearchOpen}
          onOpenChange={setMemorySearchOpen}
          namespace={userId}
        />
      ) : null}
      {memoryEntries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {memoryEntries.map((entry) => (
            <span
              key={entry.id}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
            >
              <span className="max-w-[180px] truncate" title={entry.id}>
                {memoryBadgeLabel(entry)}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => removeMemoryRecordId(entry.id)}
                aria-label="Remove memory"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {files.length > 0 && userId ? (
        <div className="flex flex-col gap-2">
          {files.map((f) => {
            const fk = fileKeyFor(f);
            return (
              <ChatComposerFileRow
                key={fk}
                fileKey={fk}
                file={f}
                userId={userId}
              />
            );
          })}
        </div>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <InputGroup className="items-stretch">
        <InputGroupTextarea
          placeholder="Accomplish anything..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={3}
          className="min-h-[4.5rem] max-h-48"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <InputGroupAddon
          align="block-end"
          className="justify-between px-2 pb-2"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-muted-foreground text-xs"
              disabled={!userId}
              onClick={() => setMemorySearchOpen(true)}
            >
              <SearchIcon className="size-3.5" />
              Memories
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground text-xs">
              <PaperclipIcon className="size-3.5" />
              <span>Attach</span>
              <input
                type="file"
                className="sr-only"
                multiple
                onChange={(e) => {
                  const list = e.target.files;
                  if (list?.length) {
                    const picked: File[] = [];
                    for (let i = 0; i < list.length; i++) {
                      const f = list.item(i);
                      if (f) picked.push(f);
                    }
                    addFiles(picked);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <InputGroupButton
            type="button"
            disabled={sendDisabled}
            onClick={() => void handleSend()}
          >
            {sending ? "Sending…" : "Send"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/** Composer-scoped drop zone; disabled while memory search modal is open so the modal owns drag-and-drop. */
export function ChatComposerDropzone({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { memorySearchOpen } = useChatComposerMemory();
  return (
    <FileDropzone disabled={memorySearchOpen} className={className}>
      {children}
    </FileDropzone>
  );
}

export function ChatComposer() {
  return (
    <ChatComposerFileProvider>
      <ChatComposerInner />
    </ChatComposerFileProvider>
  );
}
