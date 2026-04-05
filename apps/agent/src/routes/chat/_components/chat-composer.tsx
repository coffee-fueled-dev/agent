import { PaperclipIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { FileDropzone } from "@/files";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import {
  ChatComposerAttachmentsProvider,
  ChatComposerFileRow,
  fileKeyFor,
  useChatComposerAttachments,
} from "./chat-composer-attachments-provider.js";
import {
  memoryBadgeLabel,
  useChatComposerMemory,
} from "./chat-composer-memory-provider.js";
import { MemorySearchModal } from "./memory-search-modal.js";
import {
  ComposeMessageProvider,
  useComposeMessage,
} from "./use-compose-message.js";

function ChatComposerInner() {
  const { userId } = useChatThread();
  const { text, setText, send, sendDisabled, sending, error } =
    useComposeMessage();
  const {
    memoryEntries,
    removeMemoryRecordId,
    memorySearchOpen,
    setMemorySearchOpen,
    shareMemoriesAllowed,
  } = useChatComposerMemory();
  const { files, addFiles } = useChatComposerAttachments();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      {userId && shareMemoriesAllowed ? (
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
              void send();
            }
          }}
        />
        <InputGroupAddon
          align="block-end"
          className="justify-between px-2 pb-2"
        >
          <div className="flex items-center gap-2">
            {shareMemoriesAllowed ? (
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
            ) : null}
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
            onClick={() => void send()}
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
    <ChatComposerAttachmentsProvider>
      <ComposeMessageProvider>
        <ChatComposerInner />
      </ComposeMessageProvider>
    </ChatComposerAttachmentsProvider>
  );
}
