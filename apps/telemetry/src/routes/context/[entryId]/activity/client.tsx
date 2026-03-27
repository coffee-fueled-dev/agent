import { renderApp } from "../../../../render-root";
import { ContextLayout } from "../../_components/context-layout.js";
import { NamespaceProvider } from "../../_hooks/use-namespace.js";
import { ContextEntryShell } from "../_components/context-entry-shell.js";
import { parseEntrySubPath } from "../_components/entry-path.js";
import { PageSection } from "@/components/layout/page-section";
import { useContextEntry } from "../_hooks/use-context-entry.js";
import { EntryAccessWeekChart } from "./_components/entry-access-week-chart.js";
import { EntryAccessEventsList } from "./_components/entry-access-events-list.js";
import { ContextEntryHeader } from "../_components/context-entry-header.js";

function ActivityRoute() {
  const parsed = parseEntrySubPath(window.location.pathname, "activity");

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
    <ContextEntryShell entryId={parsed.entryId} segment="activity">
      <ContextEntryHeader />
      <ActivityDetailView />
    </ContextEntryShell>
  );
}

function ActivityDetailView() {
  const { namespace, entryId } = useContextEntry();

  return (
    <>
      <PageSection.Body className="gap-4">
        <PageSection.Header>
          <PageSection.Title size="lg">Usage this week</PageSection.Title>
          <PageSection.Description>
            Views and searches for this entry over the last seven days.
          </PageSection.Description>
        </PageSection.Header>
        <EntryAccessWeekChart namespace={namespace} entryId={entryId} />
      </PageSection.Body>
      <PageSection.Body className="gap-4">
        <EntryAccessEventsList namespace={namespace} entryId={entryId} />
      </PageSection.Body>
    </>
  );
}

renderApp(<ActivityRoute />);
