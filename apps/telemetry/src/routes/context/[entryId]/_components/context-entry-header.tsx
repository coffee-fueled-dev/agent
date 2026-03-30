import { PencilIcon, Trash2Icon } from "lucide-react";
import { DialogWithTabs } from "@/components/blocks/dialog-with-tabs.js";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { MimeTypeIcon } from "../../_components/mime-type-icon.js";
import { ContextEntryDeleteDialog } from "../_components/context-entry-delete-dialog.js";
import { ContextEntryEditForm } from "../_components/context-entry-edit-form.js";
import { useContextEntry } from "../_hooks/use-context-entry.js";

export function ContextEntryHeader() {
  const { detail, resetEditDraft } = useContextEntry();

  return (
    <DialogWithTabs
      onValueChange={(v) => {
        if (v === "edit") resetEditDraft();
      }}
    >
      <PageSection.Header>
        <PageSection.HeaderRow>
          <PageSection.HeaderMedia>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center rounded-md border border-border bg-muted/50 p-2">
                  <MimeTypeIcon
                    mimeType={detail.file?.mimeType}
                    className="size-4"
                  />
                </div>
              </TooltipTrigger>
              {detail.file && (
                <TooltipContent side="left">
                  {detail.file.mimeType}
                </TooltipContent>
              )}
            </Tooltip>
          </PageSection.HeaderMedia>
          <PageSection.HeaderColumn>
            <PageSection.Title>{detail.title ?? detail.key}</PageSection.Title>
          </PageSection.HeaderColumn>
          <PageSection.HeaderActions>
            <DialogWithTabs.TabsList className="space-x-2">
              <DialogWithTabs.Trigger value="edit" asChild>
                <Button variant="outline" size="sm">
                  <PencilIcon className="size-4" />
                  Edit
                </Button>
              </DialogWithTabs.Trigger>
              <DialogWithTabs.Trigger value="delete" asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </Button>
              </DialogWithTabs.Trigger>
            </DialogWithTabs.TabsList>
          </PageSection.HeaderActions>
        </PageSection.HeaderRow>
      </PageSection.Header>
      <DialogWithTabs.ContentList>
        <ContextEntryEditForm />
        <ContextEntryDeleteDialog />
      </DialogWithTabs.ContentList>
    </DialogWithTabs>
  );
}
