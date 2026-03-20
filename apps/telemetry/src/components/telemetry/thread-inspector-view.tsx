import { usePaginatedQuery, useQuery } from "convex/react";
import { MetricCard } from "@/components/blocks/metric-card";
import { SectionTitle } from "@/components/blocks/section-title";
import { TimeValue } from "@/components/formatters";
import { ListSection } from "@/components/layout/list-section";
import { EventItem } from "@/components/telemetry/event-item";
import { HistoryItem } from "@/components/telemetry/history-item";
import type { TelemetryDetailItem } from "@/components/telemetry/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ItemGroup } from "@/components/ui/item";
import { api } from "../../../../../convex/_generated/api.js";

const pageSize = 12;

export function ThreadInspectorView({
  selectedThreadId,
  onSelectDetail,
}: {
  selectedThreadId: string | null;
  onSelectDetail: (item: TelemetryDetailItem) => void;
}) {
  const recentThreads = useQuery(
    api.llms.identityTelemetry.listRecentThreadIdentityActivity,
    { limit: 50 },
  );
  const selectedThread =
    selectedThreadId == null
      ? null
      : ((recentThreads ?? []).find(
          (thread) => thread.threadId === selectedThreadId,
        ) ?? null);
  const threadCounts = useQuery(
    api.llms.identityTelemetry.getThreadIdentityCounts,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
  );
  const threadEvents = usePaginatedQuery(
    api.llms.identityTelemetry.listThreadIdentityEvents,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
    { initialNumItems: pageSize },
  );
  const threadHistory = usePaginatedQuery(
    api.llms.identityTelemetry.listThreadIdentityHistory,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
    { initialNumItems: pageSize },
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Selected thread</CardTitle>
          <CardDescription>
            Latest counts and activity for the current thread.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {selectedThread ? (
            <>
              <div className="rounded-lg border bg-background px-4 py-3">
                <div className="text-sm font-medium">
                  {selectedThread.threadId}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last activity{" "}
                  <TimeValue value={selectedThread.lastRecordedAt} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {selectedThread.codeIds.map((codeId) => (
                    <span
                      key={codeId}
                      className="rounded-full border px-2 py-1"
                    >
                      {codeId}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Bindings"
                  value={threadCounts?.bindings}
                  hint="Turn bindings recorded in this thread"
                />
                <MetricCard
                  label="Messages"
                  value={threadCounts?.messages}
                  hint="Prompt messages bound in this thread"
                />
                <MetricCard
                  label="Runtime versions"
                  value={threadCounts?.runtimeVersions}
                  hint="Runtime identities seen in this thread"
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
              Select a thread to inspect it.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle
              title="Recent thread events"
              description="A linear read of the latest identity events."
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedThreadId == null ? (
              <div className="text-sm text-muted-foreground">
                Pick a thread to load events.
              </div>
            ) : (
              <ItemGroup>
                <ListSection
                  list={threadEvents.results}
                  loading={threadEvents.isLoading}
                  className="gap-3"
                >
                  <ListSection.Loading />
                  <ListSection.Empty>No events recorded yet.</ListSection.Empty>
                  {(entry) => (
                    <EventItem
                      key={entry.eventId}
                      entry={entry}
                      onSelect={(nextEntry) =>
                        onSelectDetail({ type: "event", entry: nextEntry })
                      }
                    />
                  )}
                </ListSection>
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle
              title="Recent thread history"
              description="The latest structural history entries for the thread."
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedThreadId == null ? (
              <div className="text-sm text-muted-foreground">
                Pick a thread to load history.
              </div>
            ) : (
              <ItemGroup>
                <ListSection
                  list={threadHistory.results}
                  loading={threadHistory.isLoading}
                  className="gap-3"
                >
                  <ListSection.Loading />
                  <ListSection.Empty>
                    No history entries recorded yet.
                  </ListSection.Empty>
                  {(entry) => (
                    <HistoryItem
                      key={entry.entryId}
                      entry={entry}
                      onSelect={(nextEntry) =>
                        onSelectDetail({ type: "history", entry: nextEntry })
                      }
                    />
                  )}
                </ListSection>
              </ItemGroup>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
