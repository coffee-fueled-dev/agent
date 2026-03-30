import { LoaderIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  type AttachedFileEmbeddingState,
  useAttachedFileEmbedForSearch,
} from "@/routes/_hooks/use-attached-file-embed-for-search";
import { MimeTypeIcon } from "@/routes/context/_components/mime-type-icon";

export type { AttachedFileEmbeddingState };

export function AttachedFileEmbedRow({
  file,
  onRemove,
  onEmbeddingStateChange,
}: {
  file: File;
  onRemove: () => void;
  onEmbeddingStateChange?: (state: AttachedFileEmbeddingState) => void;
}) {
  const {
    contentHash,
    fileTextForLexical,
    embedding,
    embeddingPending,
    fileContentResolved,
  } = useAttachedFileEmbedForSearch(file);

  useEffect(() => {
    onEmbeddingStateChange?.({
      contentHash,
      fileTextForLexical,
      embedding,
      embeddingPending,
      fileContentResolved,
    });
  }, [
    contentHash,
    fileTextForLexical,
    embedding,
    embeddingPending,
    fileContentResolved,
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
      {embeddingPending && (
        <LoaderIcon className="size-3 shrink-0 animate-spin text-muted-foreground" />
      )}
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
