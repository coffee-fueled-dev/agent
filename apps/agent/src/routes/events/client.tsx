"use client";

import { useMemo } from "react";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { usePublicEnv } from "@/env/index.js";
import { renderApp } from "../../render-root.js";
import { AppLayout } from "../_components/app-layout.js";
import { EventBusStreamFiltersDialog } from "../_components/event-bus-stream-filters-dialog.js";
import { EventBusStreamList } from "../_components/event-bus-stream-list.js";
import {
  eventsFiltersToQueryArgs,
  useEventsFiltersFromUrl,
} from "./_hooks/use-events-filters-from-url.js";

function EventsRouteList() {
  const { accountToken: userId } = usePublicEnv();
  const urlFilters = useEventsFiltersFromUrl();
  const filterArgs = useMemo(
    () => eventsFiltersToQueryArgs(urlFilters),
    [urlFilters],
  );
  return (
    <EventBusStreamList
      userId={userId}
      scope={{ kind: "namespace" }}
      filters={filterArgs}
      variant="page"
      emptyTitle="No events yet."
    />
  );
}

function EventsRoute() {
  return (
    <AppLayout
      segmentLead={
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Events
        </span>
      }
      segmentTrail={<EventBusStreamFiltersDialog syncUrl />}
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
  );
}

renderApp(<EventsRoute />);
