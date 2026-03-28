import { PageSection } from "@/components/layout/page-section";
import { renderApp } from "../../render-root";
import { AppLayout } from "../_components/app-layout.js";
import { NamespaceProvider } from "../context/_hooks/use-namespace.js";
import { EventsNamespaceList } from "./_components/events-namespace-list.js";

function EventsRoute() {
  return (
    <NamespaceProvider>
      <AppLayout
        current="events"
        segmentLead={
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Events
          </span>
        }
      >
        <PageSection>
          <PageSection.Content>
            <PageSection.Body className="gap-4">
              <PageSection.Header>
                <PageSection.Title size="lg">
                  Telemetry events
                </PageSection.Title>
                <PageSection.Description>
                  All unified timeline events for your account namespace.
                </PageSection.Description>
              </PageSection.Header>
              <EventsNamespaceList />
            </PageSection.Body>
          </PageSection.Content>
        </PageSection>
      </AppLayout>
    </NamespaceProvider>
  );
}

renderApp(<EventsRoute />);
