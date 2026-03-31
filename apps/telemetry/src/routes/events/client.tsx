"use client";

import { useMemo } from "react";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { renderApp } from "../../render-root";
import { AppLayout } from "../_components/app-layout.js";
import { EventsFiltersTrigger } from "../_components/events-filters-dialog.js";
import { EventsStreamList } from "../_components/events-stream-list.js";
import { NamespaceProvider } from "../context/_hooks/use-namespace.js";
import {
  eventsFiltersToQueryArgs,
  useEventsFiltersFromUrl,
} from "./_hooks/use-events-filters-from-url.js";

function EventsRouteList() {
  const urlFilters = useEventsFiltersFromUrl();
  const filterArgs = useMemo(
    () => eventsFiltersToQueryArgs(urlFilters),
    [urlFilters],
  );
  return (
    <EventsStreamList
      scope={{ kind: "namespace" }}
      filters={filterArgs}
      variant="page"
    />
  );
}

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
        segmentTrail={<EventsFiltersTrigger />}
      >
        <PageSection>
          <PageSection.Content className="py-8">
            <SidebarInsetFill>
              <PageSection.Body className="h-full overflow-auto">
                <EventsRouteList />
              </PageSection.Body>
            </SidebarInsetFill>
          </PageSection.Content>
        </PageSection>
      </AppLayout>
    </NamespaceProvider>
  );
}

renderApp(<EventsRoute />);
