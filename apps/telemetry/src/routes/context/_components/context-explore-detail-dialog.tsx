import { api } from "@backend/api.js";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { useProjection } from "../_hooks/use-projection.js";
import { MimeTypeIcon } from "./mime-type-icon.js";

export function ContextExploreDetailDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const { selected: point, namespace } = useProjection();
  const file = useSessionQuery(
    api.context.entryQueries.getContextFile,
    point ? { entryId: point.entryId } : "skip",
  );

  if (!point) return null;

  const isImage = file?.mimeType?.startsWith("image/") && !!file?.url;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader className="flex flex-row items-center gap-2">
          <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-2 border border-border">
            <MimeTypeIcon mimeType={point.mimeType} className="size-4" />
          </div>
          <DialogTitle>{point.title || point.key}</DialogTitle>
        </DialogHeader>
        <div className="text-sm bg-muted p-4 rounded-lg">
          <DialogDescription>{point.textPreview}</DialogDescription>
        </div>
        {isImage && file?.url && (
          <img
            src={file.url}
            alt={point.title || point.key}
            className="max-h-64 rounded-lg border object-contain mx-auto"
          />
        )}
        <DialogFooter>
          <Button asChild variant="outline">
            <a
              href={`/context/${encodeURIComponent(point.entryId)}?namespace=${encodeURIComponent(namespace)}`}
            >
              View details
            </a>
          </Button>
          <DialogClose>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
