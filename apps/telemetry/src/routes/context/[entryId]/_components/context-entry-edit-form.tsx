import { DialogWithTabs } from "@/components/blocks/dialog-with-tabs";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContextEntry } from "../_hooks/use-context-entry";

export function ContextEntryEditForm() {
  const {
    detail,
    editTitle,
    setEditTitle,
    editText,
    setEditText,
    handleSave,
    saving,
  } = useContextEntry();

  return (
    <DialogWithTabs.Content value="edit">
      <DialogWithTabs.Title>
        Edit {detail.title ?? detail.key}
      </DialogWithTabs.Title>
      <div className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="edit-title">Title</FieldLabel>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Entry title"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-text">Text</FieldLabel>
            <Textarea
              id="edit-text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={10}
              placeholder="Entry text content"
            />
          </Field>
        </FieldGroup>
        <div className="flex gap-2 justify-end">
          <DialogWithTabs.Close asChild>
            <Button variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </DialogWithTabs.Close>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !editText.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </DialogWithTabs.Content>
  );
}
