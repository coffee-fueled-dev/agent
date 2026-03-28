import { api } from "@backend/api.js";
import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { useAction, useMutation } from "convex/react";
import {
  type ComponentProps,
  type PropsWithChildren,
  useMemo,
  useState,
} from "react";
import { FileDropzone, FilePreviewRow, useFiles } from "@/components/files";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { useNamespace } from "../_hooks/use-namespace.js";

function buildKey(title: string, file?: File | null) {
  const base = (title.trim() || file?.name || "context")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "context"}:${crypto.randomUUID()}`;
}

function isTextLikeFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml"
  );
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

type AddContextDialogProps = PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function AddContextDialog({
  children,
  open,
  onOpenChange,
}: AddContextDialogProps) {
  const { namespace } = useNamespace();
  const { files, addFiles, clearFiles, removeFile } = useFiles();
  const addContext = useAction(api.context.mutations.addContext);
  const addFileContext = useAction(api.context.files.addFileContext);
  const generateUploadUrl = useMutation(
    api.context.files.generateContextUploadUrl,
  );
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const file = files[0] ?? null;
  const dialogOpen = open ?? localOpen;
  const setDialogOpen = onOpenChange ?? setLocalOpen;

  const canSave = useMemo(() => Boolean(file || text.trim()), [file, text]);

  const reset = () => {
    setTitle("");
    setText("");
    setError(null);
    clearFiles();
  };

  const uploadFile = async (currentFile: File) => {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": currentFile.type || "application/octet-stream",
      },
      body: currentFile,
    });
    if (!response.ok) throw new Error("Failed to upload file.");
    const payload = (await response.json()) as { storageId?: string };
    if (!payload.storageId)
      throw new Error("Upload did not return a storage id.");
    return payload.storageId;
  };

  const handleSubmit: ComponentProps<"form">["onSubmit"] = async (event) => {
    event.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);
    try {
      const key = buildKey(title, file);

      if (!file) {
        await addContext({
          namespace,
          key,
          title: title.trim() || undefined,
          text: text.trim(),
        });
      } else {
        const [storageId, hash] = await Promise.all([
          uploadFile(file),
          contentHashFromArrayBuffer(await file.arrayBuffer()),
        ]);
        const fileText = isTextLikeFile(file)
          ? await readFileText(file)
          : undefined;

        await addFileContext({
          namespace,
          key,
          title: title.trim() || file.name,
          storageId: storageId as never,
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          text: fileText ?? (text.trim() || undefined),
          contentHash: hash,
        });
      }

      reset();
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save context.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (!next) reset();
      }}
    >
      {children}
      <DialogContent>
        <FileDropzone className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add context</DialogTitle>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor="ctx-file">File</FieldLabel>
              {file ? (
                <FilePreviewRow
                  file={file}
                  onRemove={() => removeFile(file?.name ?? "")}
                />
              ) : (
                <Input
                  id="ctx-file"
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addFiles([f]);
                  }}
                />
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="ctx-title">Title</FieldLabel>
              <Input
                id="ctx-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ctx-text">
                {file ? "Notes" : "Text"}
              </FieldLabel>
              <Textarea
                id="ctx-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  file
                    ? "Optional notes to store with this file..."
                    : "Enter context text..."
                }
                rows={6}
              />
            </Field>

            <FieldError
              className="max-h-24 overflow-auto break-all text-sm"
              errors={error ? [{ message: error }] : undefined}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="outline"
                disabled={!canSave || saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </FileDropzone>
      </DialogContent>
    </Dialog>
  );
}

AddContextDialog.Trigger = DialogTrigger;
