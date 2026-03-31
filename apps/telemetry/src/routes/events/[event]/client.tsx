import { api } from "@backend/api.js";
import { ArrowLeftIcon } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { RequiredResult } from "@/components/layout/required-result.js";
import { Button } from "@/components/ui/button.js";
import { Link } from "@/navigation/index.js";
import { renderApp } from "../../../render-root";
import { AppLayout } from "../../_components/app-layout.js";
import { NamespaceProvider } from "../../context/_hooks/use-namespace.js";
import { parseEventsEventPath } from "../_components/events-path.js";

function EventDetailRoute() {
  const parsed = parseEventsEventPath(window.location.pathname);
  const backHref = "/events";

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
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Event
            </span>
            <Button variant="ghost" asChild>
              <Link href={backHref}>
                <ArrowLeftIcon className="size-4" />
                Events
              </Link>
            </Button>
          </span>
        }
      >
        <PageSection>
          <PageSection.Content className="p-8">
            <PageSection.Body className="h-full overflow-auto">
              <RequiredResult
                query={api.chat.eventBus.getEventBusEntryForSession}
                args={{ busEntryId: parsed.eventId }}
              >
                {(data) => (
                  <PageSection.Body className="gap-4">
                    <pre className="bg-muted/50 fade-mask max-h-[min(70vh,48rem)] overflow-auto rounded-lg border p-6 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </PageSection.Body>
                )}
              </RequiredResult>
            </PageSection.Body>
          </PageSection.Content>
        </PageSection>
      </AppLayout>
    </NamespaceProvider>
  );
}

renderApp(<EventDetailRoute />);
