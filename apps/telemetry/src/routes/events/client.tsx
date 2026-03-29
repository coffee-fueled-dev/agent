import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
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
            <SidebarInsetFill>
              <PageSection.Body className="h-full overflow-auto">
                <EventsNamespaceList />
              </PageSection.Body>
            </SidebarInsetFill>
          </PageSection.Content>
        </PageSection>
      </AppLayout>
    </NamespaceProvider>
  );
}

renderApp(<EventsRoute />);
