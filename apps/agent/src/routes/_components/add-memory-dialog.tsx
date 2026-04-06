"use client";

import { api } from "@agent/backend/api";
import { useMutation } from "convex/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
  FileDropzone,
  FileDropzoneProvider,
  FileEmbeddingRow,
  type FileMemoryEmbeddingState,
  useFiles,
} from "@/files";

type AddMemoryDialogContextValue = {
  namespace: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  resetKey: number;
};

const AddMemoryDialogContext =
  createContext<AddMemoryDialogContextValue | null>(null);

function useAddMemoryDialog() {
  const ctx = useContext(AddMemoryDialogContext);
  if (!ctx) {
    throw new Error(
      "AddMemoryDialog subcomponents must be used within AddMemoryDialog",
    );
  }
  return ctx;
}

function fileKeyFor(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function AddMemoryFilePicker() {
  const { addFiles } = useFiles();
  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-foreground text-xs">
      <span className="rounded-md border bg-muted/50 px-2 py-1">
        Choose files
      </span>
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
  );
}

function AddMemoryForm({
  namespace,
  onDone,
}: {
  namespace: string;
  onDone: () => void;
}) {
  const [sessionMemoryId, setSessionMemoryId] = useState<string | null>(null);
  const [beginPending, setBeginPending] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);
  const beginOnceRef = useRef(false);
  const optionalTitleRef = useRef("");
  const [optionalTitle, setOptionalTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pendingDone, setPendingDone] = useState(false);
  const { files, clearFiles, removeFile } = useFiles();
  const [embedStates, setEmbedStates] = useState<
    Record<string, FileMemoryEmbeddingState>
  >({});

  const beginManualMemory = useMutation(
    api.memories.manualMemory.beginManualMemory,
  );
  const appendManualMemoryText = useMutation(
    api.memories.manualMemory.appendManualMemoryText,
  );

  const hasFiles = files.length > 0;
  const hasText = textContent.trim().length > 0;
  const hasContent = hasFiles || hasText;

  optionalTitleRef.current = optionalTitle;

  useEffect(() => {
    if (!hasFiles || sessionMemoryId !== null || beginOnceRef.current) {
      return;
    }
    beginOnceRef.current = true;
    setBeginPending(true);
    setBeginError(null);
    void beginManualMemory({
      namespace,
      title: optionalTitleRef.current.trim() || undefined,
    })
      .then((r) => {
        setSessionMemoryId(r.memoryRecordId);
      })
      .catch((e: unknown) => {
        setBeginError(
          e instanceof Error ? e.message : "Could not prepare file upload",
        );
      })
      .finally(() => {
        setBeginPending(false);
      });
  }, [hasFiles, sessionMemoryId, namespace, beginManualMemory]);

  useEffect(() => {
    if (files.length === 0 && beginError) {
      beginOnceRef.current = false;
      setBeginError(null);
    }
  }, [files.length, beginError]);

  const reportState = useCallback(
    (key: string, state: FileMemoryEmbeddingState) => {
      setEmbedStates((prev) => ({ ...prev, [key]: state }));
    },
    [],
  );

  const titleForEmbedding =
    optionalTitle.trim() === "" ? undefined : optionalTitle.trim();

  const filesAllComplete =
    !hasFiles ||
    files.every((f) => {
      const s = embedStates[fileKeyFor(f)];
      return s?.status === "completed";
    });

  const filesBlocking =
    hasFiles &&
    (beginError !== null ||
      !sessionMemoryId ||
      beginPending ||
      !filesAllComplete);

  const canDone =
    hasContent && !filesBlocking && !pendingDone && beginError === null;

  const handleDone = useCallback(async () => {
    const trimmedText = textContent.trim();
    if (!trimmedText && !hasFiles) return;

    setPendingDone(true);
    try {
      if (hasFiles) {
        if (!sessionMemoryId) return;
        if (trimmedText) {
          await appendManualMemoryText({
            namespace,
            memoryRecordId: sessionMemoryId,
            content: trimmedText,
          });
        }
      } else {
        await beginManualMemory({
          namespace,
          title: optionalTitle.trim() || undefined,
          initialText: trimmedText,
        });
      }
      clearFiles();
      setEmbedStates({});
      setTextContent("");
      setOptionalTitle("");
      beginOnceRef.current = false;
      setSessionMemoryId(null);
      onDone();
    } finally {
      setPendingDone(false);
    }
  }, [
    appendManualMemoryText,
    beginManualMemory,
    clearFiles,
    hasFiles,
    namespace,
    onDone,
    optionalTitle,
    sessionMemoryId,
    textContent,
  ]);

  return (
    <div className="flex flex-col gap-3">
      {beginError ? (
        <p className="text-destructive text-sm">{beginError}</p>
      ) : null}
      {hasFiles && beginPending && !sessionMemoryId ? (
        <p className="text-muted-foreground text-sm">Preparing upload…</p>
      ) : null}
      <Input
        placeholder="Title (optional)"
        value={optionalTitle}
        onChange={(e) => setOptionalTitle(e.target.value)}
        disabled={!!beginError && hasFiles}
      />
      <Textarea
        placeholder="Memory text…"
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        rows={5}
        className="min-h-[100px]"
        disabled={!!beginError && hasFiles}
      />
      <FileDropzone className="min-h-[100px] rounded-md border border-dashed p-4">
        <div className="flex flex-col gap-2 text-muted-foreground text-sm">
          <p>Add files (optional). Text and files share one memory.</p>
          <AddMemoryFilePicker />
        </div>
      </FileDropzone>
      {hasFiles && sessionMemoryId ? (
        <div className="flex flex-col gap-2">
          {files.map((f) => {
            const fk = fileKeyFor(f);
            return (
              <FileEmbeddingRow
                key={fk}
                file={f}
                namespace={namespace}
                memoryTitle={titleForEmbedding}
                memoryRecordId={sessionMemoryId}
                keyPrefix="manual"
                onRemove={() => removeFile(f.name)}
                onEmbeddingStateChange={(st) => reportState(fk, st)}
              />
            );
          })}
        </div>
      ) : null}
      <DialogFooter className="gap-2 sm:justify-end">
        <Button
          type="button"
          disabled={!canDone}
          onClick={() => void handleDone()}
        >
          {pendingDone ? "Saving…" : "Done"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function AddMemoryDialogContentInner() {
  const { namespace, setOpen, resetKey } = useAddMemoryDialog();

  const close = useCallback(() => setOpen(false), [setOpen]);

  return (
    <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add memory</DialogTitle>
      </DialogHeader>
      <FileDropzoneProvider key={resetKey} limit={5}>
        <AddMemoryForm namespace={namespace} onDone={close} />
      </FileDropzoneProvider>
    </DialogContent>
  );
}

function AddMemoryDialogRoot({
  namespace,
  children,
}: {
  namespace: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setResetKey((k) => k + 1);
    }
  }, []);

  const value = useMemo(
    (): AddMemoryDialogContextValue => ({
      namespace,
      open,
      setOpen: handleOpenChange,
      resetKey,
    }),
    [namespace, open, handleOpenChange, resetKey],
  );

  return (
    <AddMemoryDialogContext.Provider value={value}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {children}
      </Dialog>
    </AddMemoryDialogContext.Provider>
  );
}

function AddMemoryDialogTrigger({
  children,
  ...props
}: ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>;
}

export const AddMemoryDialog = Object.assign(AddMemoryDialogRoot, {
  Trigger: AddMemoryDialogTrigger,
  Content: AddMemoryDialogContentInner,
});
