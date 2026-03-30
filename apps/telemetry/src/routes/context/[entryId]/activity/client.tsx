import { PageSection } from "@/components/layout/page-section";
import { renderApp } from "../../../../render-root";
import { AppLayout } from "../../../_components/app-layout.js";
import { NamespaceProvider } from "../../_hooks/use-namespace.js";
import { ContextEntryHeader } from "../_components/context-entry-header.js";
import { ContextEntryShell } from "../_components/context-entry-shell.js";
import { parseEntrySubPath } from "../_components/entry-path.js";
import { useContextEntry } from "../_hooks/use-context-entry.js";
import { EntryAccessEventsList } from "./_components/entry-access-events-list.js";

function ActivityRoute() {
  const parsed = parseEntrySubPath(window.location.pathname, "activity");

  if (!parsed) {
    return (
      <NamespaceProvider>
        <AppLayout current="context">
          <div className="text-muted-foreground px-4 py-6 text-sm md:px-6">
            Invalid context entry URL.
          </div>
        </AppLayout>
      </NamespaceProvider>
    );
  }

  return (
    <ContextEntryShell entryId={parsed.entryId} segment="activity">
      <ContextEntryHeader />
      <ActivityDetailView />
    </ContextEntryShell>
  );
}

function ActivityDetailView() {
  const { entryId } = useContextEntry();

  return (
    <PageSection.Body className="gap-4">
      <PageSection.Header>
        <PageSection.Title size="lg">Activity</PageSection.Title>
        <PageSection.Description>
          Unified timeline events for this entry (views, searches, and related
          projections).
        </PageSection.Description>
      </PageSection.Header>
      <EntryAccessEventsList entryId={entryId} />
    </PageSection.Body>
  );
}

renderApp(<ActivityRoute />);
