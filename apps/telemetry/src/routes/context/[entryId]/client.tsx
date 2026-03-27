import { formatTime } from "@/components/formatters";
import { PageSection } from "@/components/layout/page-section";
import { renderApp } from "../../../render-root";
import { ContextLayout } from "../_components/context-layout.js";
import { NamespaceProvider } from "../_hooks/use-namespace.js";
import { ContextEntryHeader } from "./_components/context-entry-header.js";
import { ContextEntryShell } from "./_components/context-entry-shell.js";
import { EntryFileCard } from "./_components/entry-file-card";
import { parseEntryOverviewPath } from "./_components/entry-path.js";
import { LinkedNodes } from "./_components/linked-nodes";
import { VersionChain } from "./_components/version-chain.js";
import { useContextEntry } from "./_hooks/use-context-entry";

function ContextDetailRoute() {
  const parsed = parseEntryOverviewPath(window.location.pathname);

  if (!parsed) {
    return (
      <NamespaceProvider>
        <ContextLayout current="context">
          <div className="px-4 py-6 text-sm text-muted-foreground md:px-6">
            Invalid context entry URL.
          </div>
        </ContextLayout>
      </NamespaceProvider>
    );
  }

  return (
    <ContextEntryShell entryId={parsed.entryId} segment="overview">
      <ContextEntryHeader />
      <DetailView />
    </ContextEntryShell>
  );
}

function DetailView() {
  const { detail, entryId, namespace, isCurrent } = useContextEntry();

  return (
    <PageSection.Body className="gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="col-span-1 lg:col-span-3 gap-4 flex flex-col">
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
            <EntryFileCard
              file={detail.file}
              title={detail.title ?? detail.key}
            />
          )}

          <LinkedNodes namespace={namespace} entryId={entryId} />
        </div>

        <div className="col-span-3 lg:col-span-2 border rounded-lg border-border p-4 min-h-0">
          <VersionChain
            namespace={namespace}
            chain={detail.versionChain}
            currentEntryId={entryId}
          />
        </div>
      </div>
    </PageSection.Body>
  );
}

renderApp(<ContextDetailRoute />);
