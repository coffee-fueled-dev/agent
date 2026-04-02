import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MimeTypeIcon } from "./mime-type-icon";

export function FilePreviewRow({
  file,
  onRemove,
}: {
  file: File | null;
  onRemove: () => void;
}) {
  if (!file) return null;

  const mime = file.type || "application/octet-stream";
  const kb = Math.max(1, Math.round(file.size / 1024));

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <MimeTypeIcon mimeType={mime} className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{file.name}</div>
        <div className="text-muted-foreground text-xs">
          {mime} · {kb} KB
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <XIcon />
      </Button>
    </div>
  );
}
