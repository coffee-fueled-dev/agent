import { AlertCircleIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { MimeTypeIcon } from "./mime-type-icon.js";
import {
  type FileMemoryEmbeddingState,
  useFileMemoryEmbedding,
} from "./use-file-memory-embedding.js";

export type { FileMemoryEmbeddingState };

export function FileEmbeddingRow({
  file,
  namespace,
  onRemove,
  onEmbeddingStateChange,
  memoryTitle,
  keyPrefix,
  memoryRecordId,
}: {
  file: File;
  /** Convex memory namespace (e.g. user or session id). */
  namespace: string;
  onRemove: () => void;
  onEmbeddingStateChange?: (state: FileMemoryEmbeddingState) => void;
  /** Overrides display title sent to {@link api.files.store.processFile} (default: file name). */
  memoryTitle?: string;
  /** Passed to {@link buildFileMemoryKey} (e.g. `"manual"` for add-memory UI). */
  keyPrefix?: string;
  /** When set, file ingest attaches to this existing memory record. */
  memoryRecordId?: string;
}) {
  const {
    contentHash,
    storageId,
    processId,
    memoryId,
    embeddingPending,
    fileContentResolved,
    status,
    error,
  } = useFileMemoryEmbedding(file, namespace, {
    title: memoryTitle,
    keyPrefix,
    memoryRecordId,
  });

  const onEmbeddingStateChangeRef = useRef(onEmbeddingStateChange);
  onEmbeddingStateChangeRef.current = onEmbeddingStateChange;

  useEffect(() => {
    onEmbeddingStateChangeRef.current?.({
      contentHash,
      storageId,
      processId,
      memoryId,
      embeddingPending,
      fileContentResolved,
      status,
      error,
    });
  }, [
    contentHash,
    storageId,
    processId,
    memoryId,
    embeddingPending,
    fileContentResolved,
    status,
    error,
  ]);

  return (
    <div className="flex items-center gap-2 border-t px-3 py-1.5 text-xs">
      <MimeTypeIcon
        mimeType={file.type}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 truncate text-muted-foreground">
        {file.name}
      </span>
      {status === "completed" ? (
        <CheckCircle2Icon className="size-3.5 shrink-0 text-green-600" />
      ) : status === "failed" ? (
        <Tooltip>
          <TooltipTrigger>
            <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>{error ?? "Processing failed"}</TooltipContent>
        </Tooltip>
      ) : embeddingPending ? (
        <Spinner className="size-3 shrink-0 text-muted-foreground" />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        title="Remove file"
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
}
