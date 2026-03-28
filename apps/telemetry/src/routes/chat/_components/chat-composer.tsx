import { api } from "@backend/api.js";
import type { Id } from "@backend/dataModel.js";
import { useAction, useMutation } from "convex/react";
import { PaperclipIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { FilePreviewRow, useFiles } from "@/components/files";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export function ChatComposer({
  threadId,
  token,
}: {
  threadId: string;
  token: string;
}) {
  const sendMessage = useAction(api.chat.threads.sendMessage);
  const generateUploadUrl = useMutation(
    api.context.files.generateContextUploadUrl,
  );
  const { files, addFiles, clearFiles, removeFile } = useFiles();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed.");
      const payload = (await response.json()) as { storageId?: string };
      if (!payload.storageId) throw new Error("No storage id returned.");
      return payload.storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || sending) return;
    setSending(true);
    setError(null);
    try {
      const attachments =
        files.length > 0
          ? await Promise.all(
              files.map(async (file) => ({
                storageId: await uploadFile(file),
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
              })),
            )
          : undefined;

      await sendMessage({
        threadId,
        prompt: trimmed,
        attachments,
      });
      setText("");
      clearFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto">
      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <FilePreviewRow
              key={f.name}
              file={f}
              onRemove={() => removeFile(f.name)}
            />
          ))}
        </div>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <InputGroup className="items-stretch">
        <InputGroupTextarea
          placeholder="Message…"
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
            disabled={sending || (!text.trim() && files.length === 0) || !token}
            onClick={() => void handleSend()}
          >
            {sending ? "Sending…" : "Send"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
