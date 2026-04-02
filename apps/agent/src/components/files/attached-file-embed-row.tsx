import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderIcon,
  XIcon,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  type AttachedFileEmbeddingState,
  useAttachedFileEmbedForSearch,
} from "@/routes/_hooks/use-attached-file-embed-for-search";
import { MimeTypeIcon } from "./mime-type-icon";

export type { AttachedFileEmbeddingState };

export function AttachedFileEmbedRow({
  file,
  userId,
  onRemove,
  onEmbeddingStateChange,
}: {
  file: File;
  userId: string;
  onRemove: () => void;
  onEmbeddingStateChange?: (state: AttachedFileEmbeddingState) => void;
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
  } = useAttachedFileEmbedForSearch(file, userId);

  useEffect(() => {
    onEmbeddingStateChange?.({
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
    onEmbeddingStateChange,
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
        <span title={error ?? "Processing failed"}>
          <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" />
        </span>
      ) : embeddingPending ? (
        <LoaderIcon className="size-3 shrink-0 animate-spin text-muted-foreground" />
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
