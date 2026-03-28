import { api } from "@backend/api.js";
import {
  useSessionIdArg,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import { PageSection } from "@/components/layout/page-section";
import { eventsList, Link } from "@/navigation/index.js";
import { Spinner } from "@/components/ui/spinner";
import { renderApp } from "../../../render-root";
import { AppLayout } from "../../_components/app-layout.js";
import { NamespaceProvider } from "../../context/_hooks/use-namespace.js";
import { parseEventsEventPath } from "../_components/events-path.js";

function UnifiedEventDetailRoute() {
  const parsed = parseEventsEventPath(window.location.pathname);

  if (!parsed) {
    return (
      <NamespaceProvider>
        <AppLayout current="events">
          <div className="text-muted-foreground px-4 py-6 text-sm md:px-6">
            Invalid event URL.
          </div>
        </AppLayout>
      </NamespaceProvider>
    );
  }

  return (
    <NamespaceProvider>
      <AppLayout
        current="events"
        segmentLead={
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Event
          </span>
        }
      >
        <UnifiedEventDetail eventId={parsed.eventId} />
      </AppLayout>
    </NamespaceProvider>
  );
}

function UnifiedEventDetail({ eventId }: { eventId: string }) {
  const data = useSessionQuery(
    api.chat.unifiedTimeline.getUnifiedTimelineEvent,
    useSessionIdArg({ id: eventId }),
  );
  const backHref = "/events";

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
        <p className="text-muted-foreground text-sm">Event not found.</p>
        <Link href={backHref} className="text-primary text-sm underline">
          Back to events
        </Link>
      </PageSection.Body>
    );
  }

  return (
    <PageSection.Body className="gap-4">
      <p>
        <Link href={backHref} className="text-primary text-sm underline">
          Back to events
        </Link>
      </p>
      <pre className="border-border bg-muted max-h-[min(70vh,48rem)] overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </PageSection.Body>
  );
}

renderApp(<UnifiedEventDetailRoute />);
