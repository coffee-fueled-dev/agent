import { api } from "@backend/api.js";
import { useSessionAction } from "convex-helpers/react/sessions";
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
import { buildContextFileKey } from "../../_hooks/context-file.js";
import { useContextFileUpload } from "../../_hooks/use-context-file-upload.js";
import { useNamespace } from "../_hooks/use-namespace.js";

type AddContextDialogProps = PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function AddContextDialog({
  children,
  open,
  onOpenChange,
}: AddContextDialogProps) {
  const { namespace, sessionNamespaceResolved } = useNamespace();
  const { files, addFiles, clearFiles, removeFile } = useFiles();
  const addContext = useSessionAction(api.context.mutations.addContext);
  const { prepareAttachment, indexFileInContext } = useContextFileUpload();
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

  const handleSubmit: ComponentProps<"form">["onSubmit"] = async (event) => {
    event.preventDefault();
    if (!sessionNamespaceResolved || !canSave || saving) return;

    setSaving(true);
    setError(null);
    try {
      const key = buildContextFileKey({
        title,
        fileName: file?.name,
      });

      if (!file) {
        await addContext({
          namespace,
          key,
          title: title.trim() || undefined,
          text: text.trim(),
        });
      } else {
        const prepared = await prepareAttachment(file);
        await indexFileInContext({
          namespace,
          key,
          title: title.trim() || file.name,
          storageId: prepared.storageId,
          mimeType: prepared.mimeType,
          fileName: prepared.fileName,
          text: prepared.text ?? (text.trim() || undefined),
          contentHash: prepared.contentHash,
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
