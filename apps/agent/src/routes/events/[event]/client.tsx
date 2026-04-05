"use client";

import { api } from "@agent/backend/api";
import type { Id } from "@agent/backend/dataModel";
import { ArrowLeftIcon } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { RequiredResult } from "@/components/layout/required-result.js";
import { Button } from "@/components/ui/button.js";
import { usePublicEnv } from "@/env/index.js";
import { eventsList, Link } from "@/navigation/index.js";
import { renderApp } from "../../../render-root.js";
import { AppLayout } from "../../_components/app-layout.js";

function parseEventIdFromPath(pathname: string): Id<"eventBusEntries"> | null {
  const m = pathname.match(/^\/events\/([^/]+)\/?$/);
  const raw = m?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw) as Id<"eventBusEntries">;
  } catch {
    return null;
  }
}

function EventDetailRoute() {
  const { accountToken: userId } = usePublicEnv();
  const eventId =
    typeof window !== "undefined"
      ? parseEventIdFromPath(window.location.pathname)
      : null;

  if (!eventId) {
    return (
      <AppLayout
        segmentLead={
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Event
          </span>
        }
      >
        <div className="text-muted-foreground px-4 py-6 text-sm md:px-6">
          Invalid event URL.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      segmentLead={
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Event
          </span>
          <Button variant="ghost" asChild>
            <Link href={eventsList()}>
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
              args={userId ? { userId, busEntryId: eventId } : "skip"}
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
  );
}

renderApp(<EventDetailRoute />);
