import { useAction, useMutation } from "convex/react";
import { XIcon } from "lucide-react";
import {
  type ComponentProps,
  type PropsWithChildren,
  useMemo,
  useState,
} from "react";
import { api } from "../../../../../convex/_generated/api.js";
import { FileDropzone, useFiles } from "../context/file-dropzone";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useNamespace } from "./use-namespace";

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
  const addContext = useAction(api.context.contextApi.addContext);
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
        const storageId = await uploadFile(file);
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
                <FileItem
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

            {error && <p className="text-sm text-destructive">{error}</p>}

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

function FileItem({
  file,
  onRemove,
}: {
  file: File | null;
  onRemove: () => void;
}) {
  if (!file) return null;

  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{file.name}</div>
        <div className="text-muted-foreground">
          {file.type || "application/octet-stream"} ·{" "}
          {Math.max(1, Math.round(file.size / 1024))} KB
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <XIcon />
      </Button>
    </div>
  );
}

AddContextDialog.Trigger = DialogTrigger;
