import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContextEntry } from "../_hooks/use-context-entry";

export function ContextEntryEditForm() {
  const {
    editTitle,
    setEditTitle,
    editText,
    setEditText,
    cancelEditing,
    handleSave,
    saving,
  } = useContextEntry();

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="space-y-2">
        <label htmlFor="edit-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="edit-title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Entry title"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="edit-text" className="text-sm font-medium">
          Text
        </label>
        <Textarea
          id="edit-text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={10}
          placeholder="Entry text content"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={cancelEditing}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !editText.trim()}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
