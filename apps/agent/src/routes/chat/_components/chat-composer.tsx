import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { api } from "@very-coffee/backend/api";
import { useMutation } from "convex/react";
import { PaperclipIcon } from "lucide-react";
import { useState } from "react";
import { useFiles } from "@/files";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import {
  ChatComposerFileProvider,
  ChatComposerFileRow,
  fileKeyFor,
  useChatComposerFile,
} from "./chat-composer-file-provider.js";

function ChatComposerInner() {
  const { threadId, userId, createThread, setAwaitingAssistantStream } =
    useChatThread();
  const sendMessage = useMutation(
    api.chat.thread.sendMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.chat.thread.listThreadMessages),
  );
  const { files, addFiles, clearFiles } = useFiles();
  const { allAttachmentsReady, fileEmbedStates } = useChatComposerFile();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || sending) return;
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
      });
      setAwaitingAssistantStream(true);
      setText("");
      clearFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const sendDisabled =
    sending ||
    (!text.trim() && files.length === 0) ||
    !userId ||
    (files.length > 0 && !allAttachmentsReady);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
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

export function ChatComposer() {
  return (
    <ChatComposerFileProvider>
      <ChatComposerInner />
    </ChatComposerFileProvider>
  );
}
