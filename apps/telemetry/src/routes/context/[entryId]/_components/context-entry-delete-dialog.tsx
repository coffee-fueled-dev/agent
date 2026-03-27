import { DialogWithTabs } from "@/components/blocks/dialog-with-tabs";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContextEntry } from "../_hooks/use-context-entry";

export function ContextEntryDeleteDialog() {
  const { handleDelete, deleting, detail } = useContextEntry();

  return (
    <DialogWithTabs.Content value="delete" className="space-y-4">
      <DialogHeader>
        <DialogTitle>Delete {detail.title ?? detail.key}</DialogTitle>
        <DialogDescription>
          This will permanently delete this entry, its embeddings, and any
          associated files. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogWithTabs.Close asChild>
          <Button variant="outline" disabled={deleting}>
            Cancel
          </Button>
        </DialogWithTabs.Close>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogFooter>
    </DialogWithTabs.Content>
  );
}
