import { api } from "@backend/api.js";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { PageSection } from "@/components/layout/page-section";
import { Spinner } from "@/components/ui/spinner";
import { contextActivity, Link } from "@/navigation/index.js";
import { renderApp } from "../../../../../render-root";
import { AppLayout } from "../../../../_components/app-layout.js";
import { NamespaceProvider } from "../../../_hooks/use-namespace.js";
import { ContextEntryHeader } from "../../_components/context-entry-header.js";
import { ContextEntryShell } from "../../_components/context-entry-shell.js";
import { parseEntryActivityEventPath } from "../../_components/entry-path.js";
import { useContextEntry } from "../../_hooks/use-context-entry.js";

function ActivityEventRoute() {
  const parsed = parseEntryActivityEventPath(window.location.pathname);

  if (!parsed) {
    return (
      <NamespaceProvider>
        <AppLayout current="context">
          <div className="px-4 py-6 text-sm text-muted-foreground md:px-6">
            Invalid context entry URL.
          </div>
        </AppLayout>
      </NamespaceProvider>
    );
  }

  return (
    <ContextEntryShell entryId={parsed.entryId} segment="activity">
      <ContextEntryHeader />
      <ActivityEventDetail eventId={parsed.eventId} />
    </ContextEntryShell>
  );
}

function ActivityEventDetail({ eventId }: { eventId: string }) {
  const { namespace, entryId } = useContextEntry();
  const data = useSessionQuery(
    api.context.entryAccess.getContextEntryAccessEvent,
    {
      namespace,
      entryId,
      eventId,
    },
  );
  const backHref = contextActivity(entryId, { namespace });

  if (data === undefined) {
    return (
      <PageSection.Body className="flex justify-center py-12">
        <Spinner />
      </PageSection.Body>
    );
  }

  if (data === null) {
    return (
      <PageSection.Body className="gap-4">
        <p className="text-sm text-muted-foreground">Event not found.</p>
        <Link href={backHref} className="text-sm text-primary underline">
          Back to activity
        </Link>
      </PageSection.Body>
    );
  }

  return (
    <PageSection.Body className="gap-4">
      <p>
        <Link href={backHref} className="text-sm text-primary underline">
          Back to activity
        </Link>
      </p>
      <pre className="overflow-auto rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap break-words font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </PageSection.Body>
  );
}

renderApp(<ActivityEventRoute />);
