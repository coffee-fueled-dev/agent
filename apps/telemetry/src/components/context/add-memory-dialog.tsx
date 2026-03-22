import { useAction, useMutation } from "convex/react";
import { XIcon } from "lucide-react";
import {
  type ComponentProps,
  type PropsWithChildren,
  useMemo,
  useState,
} from "react";
import { api } from "../../../../../convex/_generated/api.js";
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
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { FileDropzoneInner, useFiles } from "./file-dropzone";
import { useMemories } from "./use-memories";
import { useNamespace } from "./use-namespace";

function buildMemoryKey(title: string, file?: File | null) {
  const base = (title.trim() || file?.name || "memory")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "memory"}:${crypto.randomUUID()}`;
}

function isTextLikeFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml"
  );
}

type AddMemoryDialogProps = PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

function AddMemoryDialogImpl({
  children,
  open,
  onOpenChange,
}: AddMemoryDialogProps) {
  const { namespace } = useNamespace();
  const { files, addFiles, clearFiles, removeFile } = useFiles();
  const { refresh } = useMemories();
  const upload = useMutation(api.agentMemory.generateUploadUrl);
  const uploadBinary = useMutation(api.context.binaryEmbeddings.generateUploadUrl);
  const addText = useAction(api.agentMemory.addText);
  const addStoredTextFile = useAction(api.agentMemory.addStoredTextFile);
  const addStoredBinaryFile = useAction(
    api.context.binaryEmbeddings.addStoredBinaryFile,
  );
  const [title, setTitle] = useState("");
  const [memoryText, setMemoryText] = useState("");
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const file = files[0] ?? null;
  const dialogOpen = open ?? localOpen;
  const setDialogOpen = onOpenChange ?? setLocalOpen;

  const canSave = useMemo(
    () => Boolean(file || memoryText.trim()),
    [file, memoryText],
  );

  const reset = () => {
    setTitle("");
    setMemoryText("");
    setCreateAnother(false);
    setError(null);
    clearFiles();
  };

  const uploadFile = async (currentFile: File, binary: boolean) => {
    const uploadUrl = await (binary ? uploadBinary({}) : upload({}));
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": currentFile.type || "application/octet-stream",
      },
      body: currentFile,
    });
    if (!response.ok) {
      throw new Error("Failed to upload file.");
    }
    const payload = (await response.json()) as { storageId?: string };
    if (!payload.storageId) {
      throw new Error("Upload did not return a storage id.");
    }
    return payload.storageId;
  };

  const handleSubmit: ComponentProps<"form">["onSubmit"] = async (event) => {
    event.preventDefault();
    if (!canSave || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const key = buildMemoryKey(title, file);
      const binaryFile = file ? !isTextLikeFile(file) : false;
      if (!file) {
        await addText({
          namespace,
          key,
          title: title.trim() || undefined,
          text: memoryText.trim(),
          metadata: {},
        });
      } else {
        const storageId = await uploadFile(file, binaryFile);
        const baseArgs = {
          namespace,
          key,
          title: title.trim() || file.name,
          storageId: storageId as never,
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          metadata: {},
        };

        if (isTextLikeFile(file)) {
          await addStoredTextFile(baseArgs);
        } else {
          await addStoredBinaryFile({
            ...baseArgs,
            text: memoryText.trim() || undefined,
          });
        }
      }

      if (!binaryFile) {
        await refresh();
      }
      if (createAnother) {
        reset();
      } else {
        reset();
        setDialogOpen(false);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save memory.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(nextOpen) => {
        setDialogOpen(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      {children}
      <FileDropzoneInner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new memory</DialogTitle>
          </DialogHeader>

          <FileItem file={file} onRemove={() => removeFile(file?.name ?? "")} />

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {!file ? (
              <Field>
                <FieldLabel htmlFor="memoryFile">File</FieldLabel>
                <Input
                  id="memoryFile"
                  type="file"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) {
                      addFiles([nextFile]);
                    }
                  }}
                />
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter title..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="textMemory">
                {file ? "Notes" : "Memory"}
              </FieldLabel>
              <Textarea
                name="textMemory"
                id="textMemory"
                value={memoryText}
                onChange={(event) => setMemoryText(event.target.value)}
                placeholder={
                  file
                    ? "Optional notes to store with this file..."
                    : "Enter memory..."
                }
              />
            </Field>

            <Field orientation="horizontal" className="w-fit">
              <Switch
                id="another"
                checked={createAnother}
                onCheckedChange={setCreateAnother}
              />
              <FieldLabel htmlFor="another">Create another</FieldLabel>
            </Field>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
        </DialogContent>
      </FileDropzoneInner>
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
  if (!file) {
    return null;
  }

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

export const AddMemoryDialog = Object.assign(AddMemoryDialogImpl, {
  Trigger: DialogTrigger,
});
