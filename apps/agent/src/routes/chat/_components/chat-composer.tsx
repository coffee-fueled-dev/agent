import { api } from "@backend/api.js";
import {
  useSessionAction,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { PaperclipIcon } from "lucide-react";
import { useState } from "react";
import { useFiles } from "@/components/files";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { buildContextFileKey } from "../../_hooks/context-file.js";
import { buildLexicalContextQueryMulti } from "../../_hooks/context-search-query.js";
import { useContextFileUpload } from "../../_hooks/use-context-file-upload.js";
import { useNamespace } from "../../context/_hooks/use-namespace.js";
import {
  ChatComposerFileProvider,
  ChatComposerFileRow,
  fileKeyFor,
  useChatComposerFile,
} from "./chat-composer-file-provider.js";

function ChatComposerInner({
  threadId,
  token,
  setThreadId,
  enrichWithContext = false,
}: {
  threadId: string | null;
  token: string;
  setThreadId: (id: string) => void;
  enrichWithContext?: boolean;
}) {
  const createThread = useSessionMutation(api.chat.threads.createThread);
  const sendMessage = useSessionAction(api.chat.threads.sendMessage);
  const { namespace, sessionNamespaceResolved } = useNamespace();
  const { prepareAttachment, indexFileInContext } = useContextFileUpload();
  const { files, addFiles, clearFiles } = useFiles();
  const { allAttachmentsEmbedded, getOrderedFileEmbeddings } =
    useChatComposerFile();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || sending) return;
    if (files.length > 0 && !sessionNamespaceResolved) return;
    if (files.length > 0 && !allAttachmentsEmbedded) return;
    setSending(true);
    setError(null);
    try {
      let activeThreadId = threadId;
      if (!activeThreadId) {
        activeThreadId = await createThread({ token, title: "Telemetry chat" });
        setThreadId(activeThreadId);
      }

      const attachments =
        files.length > 0
          ? await Promise.all(
              files.map(async (file) => {
                const prepared = await prepareAttachment(file);
                const key = buildContextFileKey({
                  fileName: file.name,
                  prefix: "chat",
                });
                await indexFileInContext({
                  namespace,
                  key,
                  title: file.name,
                  storageId: prepared.storageId,
                  mimeType: prepared.mimeType,
                  fileName: prepared.fileName,
                  text: prepared.text,
                  contentHash: prepared.contentHash,
                });
                return {
                  storageId: prepared.storageId,
                  fileName: prepared.fileName,
                  mimeType: prepared.mimeType,
                  contentHash: prepared.contentHash,
                  text: prepared.text,
                };
              }),
            )
          : undefined;

      let contextEnrichment:
        | {
            searchQuery?: string;
            fileEmbeddings?: number[][];
            minScore?: number;
          }
        | undefined;

      if (enrichWithContext) {
        const searchQuery = buildLexicalContextQueryMulti({
          userQuery: trimmed,
          files:
            attachments?.map((a) => ({
              fileName: a.fileName,
              fileText: a.text,
            })) ?? [],
        });

        const fileEmbeddings =
          files.length > 0 ? getOrderedFileEmbeddings(files) : undefined;

        contextEnrichment = {
          searchQuery,
          fileEmbeddings,
          minScore: 0.02,
        };
      }

      await sendMessage({
        threadId: activeThreadId,
        prompt: trimmed,
        token,
        attachments,
        contextEnrichment,
      });
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
    !token ||
    (files.length > 0 && !sessionNamespaceResolved) ||
    (files.length > 0 && !allAttachmentsEmbedded);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          {files.map((f) => {
            const fk = fileKeyFor(f);
            return <ChatComposerFileRow key={fk} fileKey={fk} file={f} />;
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

export function ChatComposer({
  threadId,
  token,
  setThreadId,
  enrichWithContext = false,
}: {
  threadId: string | null;
  token: string;
  setThreadId: (id: string) => void;
  enrichWithContext?: boolean;
}) {
  return (
    <ChatComposerFileProvider>
      <ChatComposerInner
        threadId={threadId}
        token={token}
        setThreadId={setThreadId}
        enrichWithContext={enrichWithContext}
      />
    </ChatComposerFileProvider>
  );
}
