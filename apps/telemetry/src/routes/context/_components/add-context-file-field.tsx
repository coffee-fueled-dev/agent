"use client";

import { LoaderIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  type AttachedFileEmbeddingState,
  useAttachedFileEmbedForSearch,
} from "@/routes/_hooks/use-attached-file-embed-for-search";
import { MimeTypeIcon } from "./mime-type-icon";

/**
 * Add-context dialog file row: same embedding pipeline as chat/context search; save still uses `prepareAttachment` + `indexFileInContext` separately.
 */
export function AddContextFileField({
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

  const mime = file.type || "application/octet-stream";
  const kb = Math.max(1, Math.round(file.size / 1024));
  const busy = !fileContentResolved || embeddingPending;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <MimeTypeIcon mimeType={mime} className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{file.name}</div>
        <div className="text-muted-foreground text-xs">
          {mime} · {kb} KB
        </div>
      </div>
      {busy ? (
        <LoaderIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : null}
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <XIcon />
      </Button>
    </div>
  );
}
