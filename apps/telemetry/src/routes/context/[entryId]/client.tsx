import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { RequiredResult } from "@/components/layout/required-result.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { api } from "../../../../../../convex/_generated/api.js";
import { formatTime } from "../../../components/formatters";
import { AppShell } from "../../../components/layout/app-shell";
import { PageSection } from "../../../components/layout/page-section";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { renderApp } from "../../../render-root";
import { MimeTypeIcon } from "../_components/mime-type-icon.js";
import { NamespaceProvider, useNamespace } from "../_hooks/use-namespace.js";
import { ContextEntryProvider } from "./_components/context-entry-provider";
import { EntryFileCard } from "./_components/entry-file-card";
import { LinkedNodes } from "./_components/linked-nodes";
import { NotFoundBoundary } from "./_components/not-found-boundary.js";
import { VersionChain } from "./_components/version-chain";
import { useContextEntry } from "./_hooks/use-context-entry";

function getEntryIdFromPath(pathname: string) {
  const prefix = "/context/";
  if (!pathname.startsWith(prefix)) return null;
  const [entryId] = pathname.slice(prefix.length).split("/");
  const parsed = entryId ? decodeURIComponent(entryId).trim() : "";
  return parsed || null;
}

function ContextDetailRoute() {
  const entryId = getEntryIdFromPath(window.location.pathname);

  return (
    <NamespaceProvider>
      <AppShell
        current="context"
        eyebrow="Context"
        title="Context detail"
        description="View details for a context entry."
      >
        {entryId ? (
          <ContextDetail entryId={entryId} />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            No entry ID provided.
          </div>
        )}
      </AppShell>
    </NamespaceProvider>
  );
}

function ContextDetail({ entryId }: { entryId: string }) {
  const { namespace } = useNamespace();
  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;

  return (
    <PageSection.Body variant="card" className="gap-4">
      <NotFoundBoundary fallbackHref={backHref}>
        <RequiredResult
          query={api.context.contextApi.getContextDetail}
          args={{ namespace, entryId }}
        >
          {(detail) => (
            <ContextEntryProvider
              detail={detail}
              entryId={entryId}
              namespace={namespace}
            >
              <DetailHeader />
              <DetailBody />
              <DeleteDialog />
            </ContextEntryProvider>
          )}
        </RequiredResult>
      </NotFoundBoundary>
    </PageSection.Body>
  );
}

function DetailHeader() {
  const {
    namespace,
    backHref,
    isCurrent,
    editing,
    startEditing,
    setShowDeleteDialog,
  } = useContextEntry();

  return (
    <PageSection.Header>
      <PageSection.HeaderRow>
        <PageSection.HeaderColumn>
          <PageSection.Title size="lg">Context detail</PageSection.Title>
          <PageSection.Description>{namespace}</PageSection.Description>
        </PageSection.HeaderColumn>
        <PageSection.HeaderActions className="flex flex-row items-center gap-2 justify-end">
          {!editing && isCurrent && (
            <>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <PencilIcon className="size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2Icon className="size-4" />
                Delete
              </Button>
            </>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={backHref}>
              <ArrowLeftIcon className="size-4" />
              Back
            </a>
          </Button>
        </PageSection.HeaderActions>
      </PageSection.HeaderRow>
    </PageSection.Header>
  );
}

function DetailBody() {
  const ctx = useContextEntry();

  if (ctx.editing) return <EditForm />;
  return <DetailView />;
}

function EditForm() {
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

function DetailView() {
  const { detail, entryId, namespace, isCurrent } = useContextEntry();

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center rounded-md border border-border bg-muted p-2">
              <MimeTypeIcon
                mimeType={detail.file?.mimeType}
                className="size-4"
              />
            </div>
          </TooltipTrigger>
          {detail.file && (
            <TooltipContent side="left">{detail.file.mimeType}</TooltipContent>
          )}
        </Tooltip>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            {detail.title ?? detail.key}
          </p>
        </div>
      </div>

      {!isCurrent && detail.version?.data.status === "historical" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          This is a historical version. It was replaced by{" "}
          <a
            href={`/context/${encodeURIComponent(detail.version.data.replacedByEntryId)}?namespace=${encodeURIComponent(namespace)}`}
            className="font-medium underline hover:no-underline"
          >
            a newer version
          </a>{" "}
          on {formatTime(detail.version.data.replacementTime)}.
        </div>
      )}

      <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
        {detail.fullText || detail.textPreview}
      </div>

      {detail.file && (
        <EntryFileCard file={detail.file} title={detail.title ?? detail.key} />
      )}

      {detail.versionChain.length >= 1 && (
        <VersionChain
          chain={detail.versionChain}
          currentEntryId={entryId}
          namespace={namespace}
        />
      )}

      <LinkedNodes namespace={namespace} entryId={entryId} />
    </div>
  );
}

function DeleteDialog() {
  const { showDeleteDialog, setShowDeleteDialog, handleDelete, deleting } =
    useContextEntry();

  return (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete context entry</DialogTitle>
          <DialogDescription>
            This will permanently delete this entry, its embeddings, and any
            associated files. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

renderApp(<ContextDetailRoute />);
