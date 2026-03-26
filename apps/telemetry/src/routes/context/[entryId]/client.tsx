import { useAction, useQuery } from "convex/react";
import {
  ArrowBigUpIcon,
  ArrowLeftIcon,
  GitCommitVerticalIcon,
  HistoryIcon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group.js";
import { RequiredResult } from "@/components/layout/required-result.js";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { api } from "../../../../../../convex/_generated/api.js";
import { MimeTypeIcon } from "../../../components/context-index/mime-type-icon.js";
import {
  NamespaceProvider,
  useNamespace,
} from "../../../components/context-index/use-namespace";
import { formatTime } from "../../../components/formatters";
import { AppShell } from "../../../components/layout/app-shell";
import { PageSection } from "../../../components/layout/page-section";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardFooter } from "../../../components/ui/card";
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

class NotFoundBoundary extends Component<
  { fallbackHref: string; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch(_error: Error, _info: ErrorInfo) {}
  override render() {
    if (this.state.hasError) {
      window.location.href = this.props.fallbackHref;
      return (
        <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>
      );
    }
    return this.props.children;
  }
}

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
  const detail = useQuery(api.context.contextApi.getContextDetail, {
    namespace,
    entryId,
  });
  const deleteAction = useAction(api.context.contextApi.deleteContext);
  const editAction = useAction(api.context.contextApi.editContext);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;
  const status = detail?.version?.data.status ?? "current";
  const isCurrent = status === "current";

  function startEditing() {
    if (!detail) return;
    setEditTitle(detail.title ?? "");
    setEditText(detail.fullText || detail.textPreview);
    setEditing(true);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAction({ namespace, entryId });
      window.location.href = backHref;
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await editAction({
        namespace,
        entryId,
        title: editTitle || undefined,
        text: editText,
      });
      window.location.href = `/context/${encodeURIComponent(result.entryId)}?namespace=${encodeURIComponent(namespace)}`;
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  return (
    <PageSection.Body variant="card" className="gap-4">
      <PageSection.Header>
        <PageSection.HeaderRow>
          <PageSection.HeaderColumn>
            <PageSection.Title size="lg">Context detail</PageSection.Title>
            <PageSection.Description>{namespace}</PageSection.Description>
          </PageSection.HeaderColumn>
          <PageSection.HeaderActions className="flex flex-row items-center gap-2 justify-end">
            {detail && !editing && isCurrent && (
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
      <NotFoundBoundary fallbackHref={backHref}>
        <RequiredResult
          query={api.context.contextApi.getContextDetail}
          args={{ namespace, entryId }}
        >
          {(detail) =>
            editing ? (
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
                    onClick={() => setEditing(false)}
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
            ) : (
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
                      <TooltipContent side="left">
                        {detail.file.mimeType}
                      </TooltipContent>
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

                {detail.file ? (
                  <Card className="relative w-full max-w-sm overflow-hidden pt-0 shadow-none mx-auto">
                    {detail.file.mimeType.startsWith("image/") &&
                    detail.file.url ? (
                      <>
                        <div className="absolute inset-0 z-30" />
                        <img
                          src={detail.file.url}
                          alt={detail.title ?? detail.key}
                          className="relative z-20 w-full object-cover"
                        />
                      </>
                    ) : null}
                    {detail.file.url ? (
                      <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                          <a
                            href={detail.file.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <LinkIcon className="size-4" />
                            Open file
                          </a>
                        </Button>
                      </CardFooter>
                    ) : null}
                  </Card>
                ) : null}

                {detail.versionChain.length >= 1 && (
                  <VersionChain
                    chain={detail.versionChain}
                    currentEntryId={entryId}
                    namespace={namespace}
                  />
                )}
              </div>
            )
          }
        </RequiredResult>
      </NotFoundBoundary>

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
    </PageSection.Body>
  );
}

function VersionChain({
  chain,
  currentEntryId,
  namespace,
}: {
  chain: Array<{
    entryId: string;
    kind: string;
    entryTime: number;
    payload?: unknown;
  }>;
  currentEntryId: string;
  namespace: string;
}) {
  return (
    <CollapsibleItemGroup itemCount={chain.length}>
      <CollapsibleItemGroup.Title>
        <HistoryIcon className="size-3.5 text-muted-foreground" /> Version
        history
      </CollapsibleItemGroup.Title>
      <CollapsibleItemGroup.Content>
        <CollapsibleItemGroup.ItemGroup>
          {chain.map((entry) => {
            const payload = entry.payload as
              | { title?: string; textPreview?: string }
              | undefined;
            const active = entry.entryId === currentEntryId;
            const href = `/context/${encodeURIComponent(entry.entryId)}?namespace=${encodeURIComponent(namespace)}`;
            const title = payload?.title ?? entry.entryId.slice(0, 12);

            const contextItemContent = (
              <ItemContent key={entry.entryId}>
                <span className="flex items-end gap-1">
                  <ItemTitle>{title}</ItemTitle>
                  <ItemDescription className="text-xs text-muted-foreground font-mono">
                    {entry.entryId}
                  </ItemDescription>
                </span>
                <span className="flex items-center gap-1">
                  {active && (
                    <Badge variant="outline" className="text-xs">
                      <ArrowBigUpIcon /> Current
                    </Badge>
                  )}
                  <ItemDescription>
                    {formatTime(entry.entryTime)}
                  </ItemDescription>
                </span>
              </ItemContent>
            );

            if (active) {
              return (
                <Item key={entry.entryId} size="sm" variant="outline">
                  <ItemMedia variant="icon">
                    <GitCommitVerticalIcon />
                  </ItemMedia>
                  {contextItemContent}
                </Item>
              );
            } else {
              return (
                <Item key={entry.entryId} asChild size="sm">
                  <a href={href}>
                    <ItemMedia variant="icon">
                      <GitCommitVerticalIcon />
                    </ItemMedia>
                    {contextItemContent}
                  </a>
                </Item>
              );
            }
          })}
        </CollapsibleItemGroup.ItemGroup>
      </CollapsibleItemGroup.Content>
    </CollapsibleItemGroup>
  );
}

renderApp(<ContextDetailRoute />);
