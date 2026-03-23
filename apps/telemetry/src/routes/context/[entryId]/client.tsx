import { useQuery } from "convex/react";
import { ArrowLeftIcon, FileTextIcon, LinkIcon } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api.js";
import { MimeTypeIcon } from "../../../components/context-index/mime-type-icon.js";
import { NamespaceProvider, useNamespace } from "../../../components/context-index/use-namespace";
import { formatTime } from "../../../components/formatters";
import { AppShell } from "../../../components/layout/app-shell";
import { PageSection } from "../../../components/layout/page-section";
import { Button } from "../../../components/ui/button";
import { renderApp } from "../../../render-root";

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

  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;

  return (
    <PageSection.Body variant="card" className="gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <PageSection.Title size="lg">Context detail</PageSection.Title>
          <PageSection.Description>{namespace}</PageSection.Description>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={backHref}>
            <ArrowLeftIcon className="size-4" />
            Back to context index
          </a>
        </Button>
      </div>

      {detail === undefined ? (
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : detail === null ? (
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          Context entry not found.
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-md border border-border bg-muted p-2">
              {detail.file ? (
                <MimeTypeIcon
                  mimeType={detail.file.mimeType}
                  className="size-4"
                />
              ) : (
                <FileTextIcon className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {detail.title ?? detail.key}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {detail.entryId}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            {detail.textPreview}
          </div>

          {detail.file ? (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                {detail.file.mimeType}
                {detail.file.fileName ? ` · ${detail.file.fileName}` : ""}
              </p>
              {detail.file.url ? (
                <a
                  href={detail.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <LinkIcon className="size-3.5" />
                  Open file
                </a>
              ) : null}
              {detail.file.mimeType.startsWith("image/") && detail.file.url ? (
                <img
                  src={detail.file.url}
                  alt={detail.title ?? detail.key}
                  className="mt-3 max-h-80 rounded-lg border object-contain"
                />
              ) : null}
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground/70">
            Added {formatTime(detail.createdAt)}
          </div>
        </div>
      )}
    </PageSection.Body>
  );
}

renderApp(<ContextDetailRoute />);
